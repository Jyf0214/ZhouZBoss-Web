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
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { buildPageRelativePath, resolvePageFilePath, extractTitle } from '@/lib/page-source/shared';
import { isStorageConfigured } from '@/lib/storage/storage-provider';
import { fetchPageHtml } from '@/lib/page-source/webdav';
import { checkPageAccess, type PageAccessResult } from '@/lib/storage/acl';
import { UserWidget } from '../_components/UserWidget';
import { NotConfiguredView } from '../_components/NotConfiguredView';
import { PasswordPrompt } from '../_components/PasswordPrompt';

interface PageProps {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<{ pwd?: string; auth?: string }>;
}

export const dynamic = 'force-dynamic';

function isPasswordReason(reason: PageAccessResult['reason']): boolean {
  return (
    reason === 'password-required' ||
    reason === 'wrong-password' ||
    reason === 'db-error'
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { path } = await params;
  const relativePath = buildPageRelativePath(path);
  if (!relativePath || !isStorageConfigured()) {
    return { title: 'Custom Page' };
  }
  const filePath = resolvePageFilePath(relativePath);
  const html = await fetchPageHtml(filePath);
  const title = html ? extractTitle(html) : null;
  return { title: title ?? 'Custom Page' };
}

export default async function CustomPage({ params, searchParams }: PageProps) {
  const { path } = await params;
  const { pwd, auth } = await searchParams;

  if (!isStorageConfigured()) {
    return <NotConfiguredView />;
  }

  const relativePath = buildPageRelativePath(path);
  if (!relativePath) {
    notFound();
  }

  const filePath = resolvePageFilePath(relativePath);
  const html = await fetchPageHtml(filePath);
  if (!html) {
    notFound();
  }

  // 优先从 cookie 读取密码，向后兼容 URL query 参数中的 pwd
  const cookieStore = await cookies();
  const cookieName = `pwd_${Buffer.from(filePath).toString('base64url').slice(0, 32)}`;
  const cookiePwd = cookieStore.get(cookieName)?.value ?? null;
  const queryPwd = typeof pwd === 'string' && pwd.length > 0 ? pwd : null;
  const access = await checkPageAccess(filePath, cookiePwd ?? queryPwd);

  if (access.allowed) {
    const title = extractTitle(html) ?? 'Custom Page';
    return (
      <div className="relative w-full bg-white">
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

  // auth=fail 表示前端密码验证失败后重定向过来的，展示错误提示
  const isAuthFail = auth === 'fail';

  if (isPasswordReason(access.reason) || isAuthFail) {
    return (
      <PasswordPrompt
        path={path.join('/')}
        wrongPassword={access.reason === 'wrong-password' || isAuthFail}
      />
    );
  }

  notFound();
}
