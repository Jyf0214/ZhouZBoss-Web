import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isRootRole, getSessionWithKeyId, requireApiKeyPermission, type getSession } from '@/lib/auth';
import { getUserAvatar } from '@/lib/config';
import { getAccessibleContent } from '@/lib/content-access';
import type { ContentFile } from '@/types/content';
import { getDraft, saveDraft } from '@/lib/draft-storage';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler } from '@/lib/api-handler';
import { updateFileInGithub, composeFileContent } from '@/lib/github';
import { getEnvConfig } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { getTranslate } from '@/i18n/translate';
import { isValidPostSlug } from '@/lib/post-slug';

const logger = createApiLogger('/api/articles');

/**
 * API 密钥细粒度权限检查（文章读写）
 * Cookie 认证(浏览器)直接通过；密钥认证检查 posts_* 权限
 * 返回 { session, error }：session 供公开 GET 路由识别登录态，error 非空时表示权限拒绝
 */
async function requireArticlePerm(action: 'posts_read' | 'posts_write' | 'posts_delete'): Promise<{
  session: Awaited<ReturnType<typeof getSession>>;
  error: NextResponse | null;
}> {
  const authResult = await getSessionWithKeyId();
  if (!authResult) return { session: null, error: null };
  return {
    session: authResult.session,
    error: await requireApiKeyPermission(authResult.session, authResult.currentKeyId, action),
  };
}

/**
 * Articles API
 *
 * - GET：返回已发布文章（从 posts/ 文件索引）+ 数据库草稿
 * - POST：草稿存数据库；发布时通过统一 /api/github 端点推送 MD 到 GitHub posts/ 目录
 */

/** 从数据库读取所有草稿元数据 */
async function getDraftsFromDb() {
  const db = getDb();
  const index = await db.hgetall('articles:drafts');
  const drafts: { id: string; [key: string]: unknown }[] = [];
  for (const [id, data] of Object.entries(index)) {
    try {
      drafts.push({ id, ...JSON.parse(data) });
    } catch {
      logger.warn('getDraftsFromDb', '跳过无法解析的草稿记录', { id });
    }
  }
  return drafts;
}

/** 将文件索引映射为已发布文章对象 */
function mapPublishedFiles(
  files: ContentFile[],
  authorAvatar?: string,
) {
  return files.map((f) => ({
    id: f.slug,
    slug: f.slug,
    title: f.meta.title,
    author: f.meta.author,
    authorAvatar,
    date: f.meta.date,
    tags: f.meta.tags ?? [],
    cover: f.meta.cover,
    description: f.meta.description,
    status: 'published',
  }));
}

/** 加载并过滤草稿 */
async function loadDrafts(
  session: Awaited<ReturnType<typeof getSession>>,
  authorFilter: string | null,
) {
  const allDrafts = await getDraftsFromDb();
  const isAdmin = isRootRole(session?.role) || session?.role === 'admin';
  let drafts = isAdmin ? allDrafts : allDrafts.filter((d) => d.authorId === session?.uid);
  if (authorFilter) {
    drafts = drafts.filter((d) => d.authorId === authorFilter);
  }
  for (const draft of drafts) {
    // pending_deletion 兼容：曾从回收站恢复但 status 未被正确重置的历史草稿同样补正文
    if ((draft.status === 'draft' || draft.status === 'pending_deletion') && !draft.content) {
      draft.content = (await getDraft(draft.id)) ?? '';
    }
  }
  return drafts;
}

/** 加载并过滤回收站文章（articles:index，仅已登录用户可查看） */
async function loadRecycleBin(
  session: Awaited<ReturnType<typeof getSession>>,
  authorFilter: string | null,
) {
  if (!session) return [];
  const db = getDb();
  const index = await db.hgetall('articles:index');
  const isAdmin = isRootRole(session.role) || session.role === 'admin';
  const items: { id: string; [key: string]: unknown }[] = [];
  for (const [id, data] of Object.entries(index)) {
    try {
      const meta = JSON.parse(data) as { authorId?: string; [key: string]: unknown };
      if (isAdmin || meta.authorId === session.uid) {
        items.push({ id, ...meta });
      }
    } catch {
      logger.warn('loadRecycleBin', '跳过无法解析的回收站记录', { id });
    }
  }
  if (authorFilter) {
    return items.filter((d) => d.authorId === authorFilter);
  }
  return items;
}

export const GET = apiHandler('GET', { label: getTranslate('api.articles.articleList'), requireAuth: false }, async (req) => {
  logger.info('GET', '获取文章列表');
  // session 在此自行获取：requireAuth=false 时 apiHandler 不注入 session，
  // 已发布文章公开可读，草稿/回收站仅登录用户（Cookie 或 API 密钥）可见
  const { session, error } = await requireArticlePerm('posts_read');
  if (error) return error;

  // 读取查询参数
  const authorFilter = req.nextUrl.searchParams.get('author');

  // 已发布文章：从 posts/ 文件系统索引读取（由 lib/content.ts 在构建时生成）
  const isAuthenticated = !!session;
  const { files: publishedFiles } = await getAccessibleContent('posts');
  const authorAvatar = await getUserAvatar() ?? undefined;
  let published = mapPublishedFiles(publishedFiles, authorAvatar);

  // 按 author 参数过滤已发布文章
  if (authorFilter) {
    published = published.filter((p: { author?: string }) => p.author === authorFilter);
  }

  // 草稿：仅已登录用户可查看，非 admin/root 只能看到自己的草稿
  const drafts = isAuthenticated ? await loadDrafts(session, authorFilter) : [];
  // 回收站：仅已登录用户可查看，非 admin/root 只能看到自己的回收站文章
  const recycleBin = isAuthenticated ? await loadRecycleBin(session, authorFilter) : [];

  // 合并，按日期降序
  const all = [
    ...published,
    ...drafts.map((d) => ({ ...d, status: 'draft' })),
    ...recycleBin,
  ].sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
    const dateA = a.date ? new Date(a.date as string).getTime() : 0;
    const dateB = b.date ? new Date(b.date as string).getTime() : 0;
    return dateB - dateA;
  });

  logger.info('GET', '获取文章列表成功', { count: all.length });
  return NextResponse.json(all, {
    headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' },
  });
});

/**
 * 构建文章 frontMatter 对象
 */
function buildPostFrontMatter(fields: {
  title: string;
  author: string;
  date: string;
  tags: string[];
  coverImage?: string;
  description?: string;
}): Record<string, unknown> {
  const fm: Record<string, unknown> = { title: fields.title, author: fields.author, date: fields.date, tags: fields.tags };
  if (fields.coverImage) fm.cover = fields.coverImage;
  if (fields.description) fm.description = fields.description;
  return fm;
}

interface ArticleMetaForPublish {
  id: string;
  title: string;
  authorName: string;
  tags: string[];
}

/**
 * 将已发布文章推送到 GitHub 并更新数据库
 */
async function handlePublishedPost(
  articleMeta: ArticleMetaForPublish,
  content: string,
  meta: {
    coverImage: string;
    description: string;
    slug: string | undefined;
    now: string;
  },
) {
  const postSlug = meta.slug ?? `/${articleMeta.authorName}/${articleMeta.id}`;
  const filePath = `posts${postSlug}.md`;

  const env = getEnvConfig();
  if (!env.githubRepo || !env.githubToken) {
    logger.error('POST', 'GitHub 配置缺失');
    return NextResponse.json({ error: getTranslate('api.github.missingConfig') }, { status: 500 });
  }

  try {
    await updateFileInGithub({
      repo: env.githubRepo,
      token: env.githubToken,
      path: filePath,
      content: await composeFileContent(undefined, buildPostFrontMatter({
        title: articleMeta.title,
        author: articleMeta.authorName,
        date: meta.now,
        tags: articleMeta.tags,
        coverImage: meta.coverImage,
        description: meta.description,
      }), content || ''),
      message: `feat: publish post "${articleMeta.title}"`,
    });
  } catch (error: unknown) {
    logger.error('POST', '发布文章失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: getTranslate('api.articles.publishFailed') }, { status: 500 });
  }

  const db = getDb();
  const backupMeta = { ...articleMeta, status: 'published', content: '', slug: postSlug };
  await db.set(`article:data:${articleMeta.id}`, JSON.stringify(backupMeta));
  await db.hset('articles:published', articleMeta.id, JSON.stringify(backupMeta));

  return NextResponse.json({ success: true, id: articleMeta.id, slug: postSlug });
}

export const POST = apiHandler('POST', { label: getTranslate('api.articles.createArticle'), requireAuth: true }, async (req, _ctx, session) => {
  // API 密钥认证的请求需 posts_write 权限
  const { error } = await requireArticlePerm('posts_write');
  if (error) return error;

  const rl = rateLimit(`${session!.uid}:articles-write`, 20, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: getTranslate('api.common.rateLimited') }, { status: 429 });
  }

  const { title, content, tags: rawTags, coverImage, status, slug, description } = await req.json();
  const tags = Array.isArray(rawTags) ? rawTags.filter((t: unknown): t is string => typeof t === 'string') : [];
  logger.info('POST', '创建文章', { title, status });
  const id = `draft-${Date.now().toString(36)}`;
  const now = new Date().toISOString();

  const articleMeta = {
    id,
    title,
    content: content ?? '',
    authorId: session!.uid,
    authorName: session!.email.split('@')[0] ?? 'unknown',
    tags: tags ?? [],
    coverImage: coverImage ?? '',
    description: description ?? '',
    status: status ?? 'draft',
    createdAt: now,
    updatedAt: now,
  };

  if (!isValidPostSlug(slug)) {
    void logAudit('article_create_failed', 'posts', `创建文章失败：slug 含非法字符（${title}）`, session!.uid);
    return NextResponse.json({ error: getTranslate('api.articles.invalidSlugChars') }, { status: 400 });
  }

  if (status === 'published') {
    const resp = await handlePublishedPost(articleMeta, content, { coverImage, description, slug, now });
    if (!resp.ok) {
      void logAudit('article_publish_failed', 'posts', `发布文章失败：${title}`, session!.uid);
    } else {
      void logAudit('article_create', 'posts', `发布文章：${title}`, session!.uid);
    }
    return resp;
  }

  const db = getDb();
  if (content) {
    await saveDraft(id, content);
  }
  const draftMeta = { ...articleMeta, content: '' };
  await db.set(`article:data:${id}`, JSON.stringify(draftMeta));
  await db.hset('articles:drafts', id, JSON.stringify(draftMeta));

  void logAudit('article_create', 'posts', `创建草稿：${title}`, session!.uid);
  return NextResponse.json({ success: true, id });
});
