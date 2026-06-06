/**
 * Clerk 动态导入工具
 *
 * 所有对 @clerk/nextjs 的引用都通过此模块进行动态导入，
 * 使得 Clerk 依赖变为可选（optionalDependencies）。
 * 当 Clerk 未安装或未配置环境变量时，相关功能静默降级。
 *
 * 使用 new Function 构建运行时 import() 以绕过构建器的静态分析，
 * 确保即使 @clerk/nextjs 未安装，构建也不会失败。
 */

/**
 * 同步检查 Clerk 是否应该启用
 * 基于环境变量（构建时注入）判断
 */
export function isClerkConfigured(): boolean {
  return !!(
    typeof process !== 'undefined' &&
    process.env?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  );
}

/**
 * 异步检查 Clerk 模块是否可加载
 */
export async function isClerkAvailable(): Promise<boolean> {
  if (!isClerkConfigured()) return false;
  try {
    const mod = await runtimeImport('@clerk/nextjs');
    return !!mod;
  } catch {
    return false;
  }
}

/**
 * 运行时动态 import()，避开构建器静态分析
 * new Function 创建的函数不受 bundler 追踪
 */
function runtimeImport(specifier: string): Promise<unknown> {
  // biome-ignore lint/security/noGlobalFunction: required to bypass bundler static analysis
  const importFn = new Function('s', 'return import(s)') as (s: string) => Promise<unknown>;
  return importFn(specifier);
}

/**
 * 动态加载 @clerk/nextjs（客户端模块）
 */
export async function loadClerkClient<T = Record<string, unknown>>(): Promise<T | null> {
  try {
    const mod = await runtimeImport('@clerk/nextjs');
    return mod as T;
  } catch {
    return null;
  }
}

/**
 * 动态加载 @clerk/nextjs/server（服务端模块）
 */
export async function loadClerkServer<T = Record<string, unknown>>(): Promise<T | null> {
  try {
    const mod = await runtimeImport('@clerk/nextjs/server');
    return mod as T;
  } catch {
    return null;
  }
}

/**
 * 获取 Clerk auth() 方法，仅服务端使用
 */
export async function getClerkAuth(): Promise<(() => Promise<{ userId: string | null }>) | null> {
  const mod = await loadClerkServer<{ auth: () => Promise<{ userId: string | null }> }>();
  if (!mod?.auth) return null;
  return mod.auth;
}
