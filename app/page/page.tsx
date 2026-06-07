/**
 * /page — 自定义 HTML 页面索引(服务端入口)
 *
 * - 服务端从构建期同步下来的 `./pages/` 镜像浅层扫描(根 + 1 级子目录)
 *   (镜像由 `scripts/sync-pages.mjs` 在 `npm run build` 时生成)
 * - 列出所有 .html/.htm 文件,显示文件名、所在目录、是否私有
 * - 私有判定:`StorageFolder.public` 字段驱动(由 `/admin/storage` 设置)
 * - 私有页面在列表中带锁标,点击仍走 `/page/<path>` 路由,密码提示由原 PasswordPrompt 组件处理
 *
 * 重要:
 * - 此处不继承任何 layout。/page/[...path] 是全屏 iframe,加父 layout 会污染其渲染。
 * - 视图由 PageIndexView 客户端组件渲染,本文件只负责数据获取。
 * - 公开访问,无需登录(与单页面策略一致)。
 *
 * 行为对齐:
 * - 本地 `./pages/` 不存在或为空 → 展示「暂无可用页面」空状态卡
 *   (WebDAV 未配置时同步脚本已清空目录,运行时无需再区分"未配置"和"空")
 * - 本地 `./pages/` 有内容 → 正常列出 + 拼接链接
 */
import 'server-only';
import { getDb } from '@/lib/db';
import { PAGES_PREFIX } from '@/lib/page-source/shared';
import { isLocalPagesEmpty, scanLocalPagesHtml, readPageTitle } from './_lib/fs-page';
import { PageIndexView, type PageIndexItem } from './_components/PageIndexView';

export const dynamic = 'force-dynamic';

/**
 * 批量查询若干目录的 StorageFolder 私有元数据
 * - DB 未配置 → 返回空 Set,全部视为公开
 * - 任何目录查询失败 → 视为「无配置」= 公开(失败安全语义)
 */
async function loadPrivateDirs(dirs: readonly string[]): Promise<Set<string>> {
  const prisma = getDb().prisma;
  if (!prisma) return new Set();
  const uniqueDirs = Array.from(new Set(dirs.filter(d => d.length > 0)));
  if (uniqueDirs.length === 0) return new Set();
  const privateSet = new Set<string>();
  try {
    const rows = await prisma.storageFolder.findMany({
      where: { path: { in: uniqueDirs } },
      select: { path: true, public: true },
    });
    for (const row of rows) {
      if (!row.public) privateSet.add(row.path);
    }
  } catch (err) {
    console.error('[custom-page-index] load folder meta failed:', err);
  }
  return privateSet;
}

export default async function PageIndex() {
  // ./pages/ 不存在 / 为空 → 统一走空状态卡(WebDAV 未配置时同步脚本已清空目录)
  if (await isLocalPagesEmpty()) {
    return <PageIndexView notConfigured={false} pages={[]} />;
  }

  const scanned = (await scanLocalPagesHtml()).map((entry) => ({
    relativePath: entry.relativePath,
    dir: entry.dir,
    filename: entry.filename,
  }));

  if (scanned.length === 0) {
    return <PageIndexView notConfigured={false} pages={[]} />;
  }

  const privateDirs = await loadPrivateDirs(scanned.map(s => s.dir));

  // 标题提取(每文件独立,失败时降级为文件名)
  const items: PageIndexItem[] = await Promise.all(
    scanned.map(async ({ relativePath, dir, filename }): Promise<PageIndexItem> => {
      let title = filename;
      try {
        const extracted = await readPageTitle(relativePath);
        if (extracted) title = extracted;
      } catch {
        /* 保持 filename */
      }
      // 链接:去掉 pages/ 前缀,直接拼到 /page/<relative-without-prefix>
      // 例如 'pages/about.html' → '/page/about.html'
      //      'pages/blog/post.html' → '/page/blog/post.html'
      const href = `/page/${relativePath.slice(PAGES_PREFIX.length + 1)}`;
      return {
        href,
        filename,
        folder: dir.slice(PAGES_PREFIX.length + 1),
        title,
        isPrivate: privateDirs.has(dir),
      };
    }),
  );

  return <PageIndexView notConfigured={false} pages={items} />;
}
