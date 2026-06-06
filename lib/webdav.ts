/**
 * WebDAV 客户端封装
 *
 * 用途:为「存储池」功能提供 WebDAV 远程服务的基础客户端封装。
 * 本文件只暴露客户端构造与配置检测,不直接执行读写操作(交给上层 API 路由)。
 *
 * 命名空间:`webdav`(无 `~` 标记,与其它 `lib/*` 模块同级)
 */
import { createClient, type WebDAVClient } from 'webdav'

/** 未配置时给上层抛出的统一错误信息 */
const NOT_CONFIGURED_MESSAGE =
  'WebDAV 未配置,请在 .env.local 设置 WEBDAV_URL/WEBDAV_USER/WEBDAV_PASS'

/**
 * globalThis 单例缓存:避免每次请求都重新构造 WebDAV 客户端
 * 参考 `lib/db.ts` 中 prisma 单例的实现方式
 */
const globalForWebDav = globalThis as unknown as {
  webDavClient: WebDAVClient | undefined
}

/**
 * 检测 WebDAV 存储池是否已配置
 *
 * 三个环境变量 `WEBDAV_URL` / `WEBDAV_USER` / `WEBDAV_PASS` 必须全部存在才返回 true。
 * 部分缺失视为未配置(失败安全)。
 *
 * @returns 是否已配置(且环境变量均非空字符串)
 */
export function isWebDavConfigured(): boolean {
  const url = process.env.WEBDAV_URL
  const user = process.env.WEBDAV_USER
  const pass = process.env.WEBDAV_PASS
  return !!(url && user && pass)
}

/**
 * 构造 WebDAV 客户端(每次返回同一实例,惰性初始化)
 *
 * 注意:本函数不会校验环境变量,直接调用可能在运行时抛出底层网络错误。
 * 上层(API 路由)应先调用 `isWebDavConfigured()` 或 `requireWebDavClient()` 判定。
 *
 * @returns 缓存的 WebDAVClient 单例
 * @throws 当环境变量缺失时,会抛出底层 `createClient` 相关的错误
 */
export function getWebDavClient(): WebDAVClient {
  if (!globalForWebDav.webDavClient) {
    const url = process.env.WEBDAV_URL
    const user = process.env.WEBDAV_USER
    const pass = process.env.WEBDAV_PASS

    if (!url || !user || !pass) {
      // 显式抛出,让上层立即失败而不是构造一个无效客户端
      throw new Error(NOT_CONFIGURED_MESSAGE)
    }

    globalForWebDav.webDavClient = createClient(url, {
      username: user,
      password: pass,
    })
  }
  return globalForWebDav.webDavClient
}

/**
 * 强约束:必须已配置 WebDAV,否则直接抛出明确错误
 *
 * 给 API 路由等必须依赖 WebDAV 的代码路径使用。
 * UI 层不应直接调用本函数(应通过 `isWebDavConfigured()` 判定后降级显示)。
 *
 * @returns 已初始化的 WebDAVClient 单例
 * @throws 未配置时抛出 `new Error(NOT_CONFIGURED_MESSAGE)`
 */
export function requireWebDavClient(): WebDAVClient {
  return getWebDavClient()
}
