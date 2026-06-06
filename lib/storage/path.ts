/**
 * 存储池路径工具函数
 *
 * 用途:统一处理 WebDAV 路径的拼接、拆分、校验、URL 编码。
 * 所有函数均为纯函数,无副作用。
 */

/**
 * 拼接多段路径,自动处理多余斜杠
 *
 * - 自动去除每段首尾的 `/` 和 `\`
 * - 用单个 `/` 拼接
 * - 全部为空时返回空字符串(代表根)
 *
 * @example
 * joinPath('a', 'b', 'c')       // 'a/b/c'
 * joinPath('/a/', '/b/', 'c')   // 'a/b/c'
 * joinPath('', '')              // ''
 * joinPath('a')                  // 'a'
 */
export function joinPath(...parts: string[]): string {
  return parts
    .map((part) => part.replace(/^[\\/]+|[\\/]+$/g, ''))
    .filter((part) => part.length > 0)
    .join('/')
}

/**
 * 拆分目录与文件名
 *
 * - 输入 `'a/b/c.txt'` → `{ dir: 'a/b', filename: 'c.txt' }`
 * - 输入 `'c.txt'` → `{ dir: '', filename: 'c.txt' }`
 * - 输入 `''` → `{ dir: '', filename: '' }`
 * - 输入 `'a/b/'` → 先规范化,得到 `{ dir: 'a', filename: 'b' }`
 */
export function splitDirFilename(path: string): { dir: string; filename: string } {
  const normalized = path.replace(/^[\\/]+|[\\/]+$/g, '')
  if (!normalized) return { dir: '', filename: '' }
  const lastSlash = normalized.lastIndexOf('/')
  if (lastSlash === -1) {
    return { dir: '', filename: normalized }
  }
  return {
    dir: normalized.substring(0, lastSlash),
    filename: normalized.substring(lastSlash + 1),
  }
}

/**
 * 校验路径合法性(防穿越、防绝对路径、防空段)
 *
 * 拒绝:
 * - 空字符串
 * - 以 `/` 或 `\` 开头(绝对路径)
 * - 包含 `..` 段(目录穿越)
 * - 包含 `\0` 或控制字符
 * - 包含连续斜杠(由 `joinPath` 规范化处理)
 *
 * @example
 * isValidPath('covers/img.png')  // true
 * isValidPath('/etc/passwd')     // false
 * isValidPath('a/../b')          // false
 * isValidPath('')                // false
 */
export function isValidPath(path: string): boolean {
  if (typeof path !== 'string' || path.length === 0) return false
  if (path.startsWith('/') || path.startsWith('\\')) return false
  // 控制字符检查
  if (/[\x00-\x1f]/.test(path)) return false
  const segments = path.split('/')
  for (const seg of segments) {
    if (seg === '..' || seg === '.') return false
  }
  return true
}

/**
 * URL 编码路径(保留 `/`,对每段单独编码)
 *
 * - `/` 保留为分隔符,不参与编码
 * - 其它字符(中文、空格、特殊符号)用 `encodeURIComponent` 处理
 * - 空字符串返回空字符串
 *
 * @example
 * encodeFilePath('covers/中文 图片.png')
 *   // 'covers/%E4%B8%AD%E6%96%87%20%E5%9B%BE%E7%89%87.png'
 * encodeFilePath('')   // ''
 */
export function encodeFilePath(path: string): string {
  if (!path) return ''
  return path
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')
}
