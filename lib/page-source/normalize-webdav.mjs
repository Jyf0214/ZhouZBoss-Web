// 自定义 HTML 页面 — WebDAV 内容归一化纯函数(纯 JS)
//
// 用途:
// - 同步脚本(scripts/sync-pages.mjs)与运行时 server component 共享同一份实现
// - 放成 .mjs 是为了让 Node ESM 脚本能直接 import,无需 tsx/ts-node 等额外依赖
// - TypeScript 一侧通过 lib/page-source/shared.ts 的 re-export 间接使用
//
// 注意:本文件没有类型注解,任何修改需保持与 lib/page-source/shared.ts 中
// re-export 的签名一致;同步脚本与 server component 走的是同一段代码。

/**
 * 将 `webdav` 客户端 `getFileContents` 的多种返回类型统一转为 UTF-8 字符串
 *
 * 支持形态:
 * - `string`:直接返回
 * - `Buffer`(Node 环境):`toString('utf8')`
 * - `ArrayBuffer` / `Uint8Array` 等 Web 环境二进制:`TextDecoder('utf-8')` 解码
 * - `{ data: ... }` 形态(`ResponseDataDetailed`):递归对内部 `data` 字段归一化
 *
 * @param {string | Buffer | ArrayBuffer | Uint8Array | { data: string | Buffer | ArrayBuffer | Uint8Array }} raw
 * @returns {string}
 */
export function normalizeWebDavContent(raw) {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(raw)) {
    return raw.toString('utf8');
  }
  if (raw instanceof Uint8Array) {
    return new TextDecoder('utf-8').decode(raw);
  }
  if (typeof ArrayBuffer !== 'undefined' && raw instanceof ArrayBuffer) {
    return new TextDecoder('utf-8').decode(new Uint8Array(raw));
  }
  if (typeof raw === 'object' && 'data' in raw) {
    return normalizeWebDavContent(raw.data);
  }
  return '';
}
