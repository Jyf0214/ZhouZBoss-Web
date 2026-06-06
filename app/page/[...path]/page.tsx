/**
 * 自定义 HTML 页面动态路由
 *
 * 路径格式:`/page/<...任意子路径>.html`
 * - 服务端从 WebDAV 的 `pages/` 根读取对应 HTML 文件
 * - 渲染为带沙箱的 iframe(只允许 scripts/forms,不允许同源)
 * - 右上角浮动用户 widget(已登录展示头像,未登录展示「游客」+ 登录入口)
 *
 * 私有页面支持:
 * - 目标页所属目录若配置了访问密码,首次访问触发密码输入框
 * - 提交密码后,服务端根据 `?pwd=xxx` 重新校验,通过则正常渲染
 * - 密码错误时保留 URL 与输入框,顶部红条提示「密码错误」
 *
 * 失败行为:
 * - WebDAV 未配置 → 友好提示页(引导补全环境变量)
 * - 路径非法 / 扩展名非 .html/.htm → 404
 * - 文件不存在 / 读取失败 → 404
 * - 密码相关错误 → 渲染 PasswordPrompt,不 404(允许用户重试)
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isWebDavConfigured } from '@/lib/webdav';
import {
  buildPageRelativePath,
  extractTitle,
  fetchPageHtml,
} from '../_lib/webdav-page';
import { checkPageAccess, type PageAccessResult } from '@/lib/storage/acl';
import { UserWidget } from '../_components/UserWidget';
import { NotConfiguredView } from '../_components/NotConfiguredView';
import { PasswordPrompt } from '../_components/PasswordPrompt';

interface PageProps {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<{ pwd?: string }>;
}

export const dynamic = 'force-dynamic';

/** 是否属于「需要展示密码输入框」的拒绝原因 */
function isPasswordReason(
  reason: PageAccessResult['reason'],
): boolean {
  return (
    reason === 'password-required' ||
    reason === 'wrong-password' ||
    reason === 'db-error'
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { path } = await params;
  const relativePath = buildPageRelativePath(path);
  if (!relativePath || !isWebDavConfigured()) {
    return { title: 'Custom Page' };
  }
  const html = await fetchPageHtml(relativePath);
  const title = html ? extractTitle(html) : null;
  return { title: title ?? 'Custom Page' };
}

export default async function CustomPage({ params, searchParams }: PageProps) {
  const { path } = await params;
  const { pwd } = await searchParams;

  if (!isWebDavConfigured()) {
    return <NotConfiguredView />;
  }

  const relativePath = buildPageRelativePath(path);
  if (!relativePath) {
    notFound();
  }

  // 拉取 HTML:文件存在性检查与 ACL 校验都在这一步之后
  // 这样空密码的私有目录也能正确触发「请输入密码」而非 404
  const html = await fetchPageHtml(relativePath);
  if (!html) {
    notFound();
  }

  // 归一化:空字符串视为未提供密码
  const queryPwd = typeof pwd === 'string' && pwd.length > 0 ? pwd : null;
  const access = await checkPageAccess(relativePath, queryPwd);

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

  // 密码相关原因:展示输入框,允许重试
  // 注意:跳回 URL 用原始 path(不含 pages/ 前缀),否则会拼成 /page/pages/...
  if (isPasswordReason(access.reason)) {
    return (
      <PasswordPrompt
        path={path.join('/')}
        wrongPassword={access.reason === 'wrong-password'}
      />
    );
  }

  // 其他拒绝原因(预留扩展):走 404
  notFound();
}
