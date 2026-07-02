/**
 * 存储池页面通用格式化函数
 *
 * 全部为纯函数,可独立测试。
 */

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/**
 * 字节数格式化为可读字符串
 *
 * @example
 * formatBytes(0)           // '0 B'
 * formatBytes(1024)        // '1.0 KB'
 * formatBytes(1536)        // '1.5 KB'
 * formatBytes(1024 * 1024) // '1.0 MB'
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
  const value = bytes / Math.pow(1024, exp);
  const formatted = exp === 0 ? value.toString() : value.toFixed(1);
  return `${formatted} ${BYTE_UNITS[exp]}`;
}

/**
 * ISO 时间字符串格式化为本地化展示
 *
 * 解析失败时返回原始字符串(失败安全)。
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return typeof value === 'string' ? value : '-';
  return date.toLocaleString();
}

/**
 * 拆分路径为面包屑段
 *
 * - `covers/2024/img.png` → `['covers', '2024', 'img.png']`
 * - `''` → `[]`(根)
 */
export function splitPath(path: string): string[] {
  if (!path) return [];
  return path
    .replace(/^[\\/]+|[\\/]+$/g, '')
    .split('/')
    .filter((seg) => seg.length > 0);
}

/**
 * 由子段拼接祖先路径
 *
 * - getAncestorPath(['a','b','c'], 1) → 'a'
 * - getAncestorPath(['a','b','c'], 0) → ''
 */
export function getAncestorPath(segments: string[], depth: number): string {
  return segments.slice(0, depth).join('/');
}
