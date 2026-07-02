/**
 * 自定义 HTML 页面动态路由
 *
 * 路径格式: /page/<...任意子路径>.html
 * - 服务端从 WebDAV 读取对应 HTML 文件
 * - 渲染为带沙箱的 iframe(只允许 scripts/forms,不允许同源)
 *
 * 私有页面支持:
 * - 目标页所属目录若配置了访问密码,首次访问触发密码输入框
 * - 密码错误时保留 URL 与输入框,顶部红条提示
 *
 * 失败行为:
 * - WebDAV 未配置 → 友好提示页
 * - 路径非法 / 扩展名非 .html/.htm → 404
 * - 文件不存在 / 读取失败 → 404
 * - 密码相关错误 → 渲染 PasswordPrompt,不 404
 */
import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { buildPageRelativePath, resolvePageFilePath, extractTitle } from '@/lib/page-source/shared';
import { isStorageConfigured } from '@/lib/storage/storage-provider';
import { fetchPageHtml } from '@/lib/page-source/webdav';
import { checkPageAccess, type PageAccessResult } from '@/lib/storage/acl';
import { UserWidget } from '../_components/UserWidget';
import { NotConfiguredView } from '../_components/NotConfiguredView';
import { PasswordPrompt } from '../_components/PasswordPrompt';

// 用 React cache 包装，确保 generateMetadata 和组件体共享同一次 WebDAV 请求
const cachedFetchPageHtml = cache(fetchPageHtml);

interface PageProps {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<{ pwd?: string }>;
}

export const dynamic = 'force-dynamic';

function isPasswordReason(reason: PageAccessResult['reason']): boolean {
  return (
    reason === 'wrong-password'
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { path } = await params;
  const relativePath = buildPageRelativePath(path);
  if (!relativePath || !isStorageConfigured()) {
    return { title: 'Custom Page' };
  }
  let filePath = resolvePageFilePath(relativePath);
  let html = await cachedFetchPageHtml(filePath);
  if (!html && !filePath.endsWith('.html')) {
    filePath = `${relativePath}.html`;
    html = await cachedFetchPageHtml(filePath);
  }
  const title = html ? extractTitle(html) : null;
  return { title: title ?? 'Custom Page' };
}

export default async function CustomPage({ params, searchParams }: PageProps) {
  const { path } = await params;
  const { pwd } = await searchParams;

  if (!isStorageConfigured()) {
    return <NotConfiguredView />;
  }

  const relativePath = buildPageRelativePath(path);
  if (!relativePath) {
    notFound();
  }

  let filePath = resolvePageFilePath(relativePath);
  let html = await cachedFetchPageHtml(filePath);
  // 根级 HTML 页面（如 pages/about.html）的 clean URL 访问：
  // resolvePageFilePath 会尝试 index.html，若不存在则尝试 .html 后缀
  if (!html && !filePath.endsWith('.html')) {
    filePath = `${relativePath}.html`;
    html = await cachedFetchPageHtml(filePath);
  }
  if (!html) {
    notFound();
  }

  const queryPwd = typeof pwd === 'string' && pwd.length > 0 ? pwd : null;
  const access = await checkPageAccess(filePath, queryPwd);

  if (access.allowed) {
    const title = extractTitle(html) ?? 'Custom Page';
    return (
      <div className="relative w-full bg-white dark:bg-zinc-900">
        <iframe
          srcDoc={html}
          sandbox="allow-scripts allow-forms"
          className="h-screen w-full border-0"
          title={title}
        />
        <UserWidget />
      </div>
    );
  }

  if (isPasswordReason(access.reason)) {
    return (
      <PasswordPrompt
        path={path.join('/')}
        wrongPassword={access.reason === 'wrong-password'}
      />
    );
  }

  // 私有页面但管理员未设置密码 → 明确提示，而非显示无意义的密码输入框
  if (access.reason === 'password-required') {
    return (
      <PasswordPrompt
        path={path.join('/')}
        wrongPassword={false}
        hint="此页面已设为私有但尚未配置访问密码，请联系管理员"
      />
    );
  }

  // 数据库错误 → 明确提示，而非陷入密码输入循环
  if (access.reason === 'db-error' || access.reason === 'db-not-configured') {
    return (
      <PasswordPrompt
        path={path.join('/')}
        wrongPassword={false}
        hint="服务暂时不可用，请稍后再试"
      />
    );
  }

  notFound();
}
