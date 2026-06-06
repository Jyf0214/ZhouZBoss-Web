import { describe, expect, test, beforeEach, afterEach } from 'vitest'
import { isWebDavConfigured, requireWebDavClient } from '@/lib/webdav'
import { joinPath, splitDirFilename, isValidPath, encodeFilePath } from '@/lib/storage/path'
import { normalizePath, getTopLevelFolder } from '@/lib/storage/acl'

describe('WebDAV 配置检测', () => {
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    // 复制当前 env,清空所有 WebDAV 相关变量
    process.env = { ...ORIGINAL_ENV }
    delete process.env.WEBDAV_URL
    delete process.env.WEBDAV_USER
    delete process.env.WEBDAV_PASS
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  test('三个 env 都未设置时,isWebDavConfigured 返回 false', () => {
    expect(isWebDavConfigured()).toBe(false)
  })

  test('只设置部分 env 时,isWebDavConfigured 返回 false', () => {
    process.env.WEBDAV_URL = 'https://dav.example.com'
    process.env.WEBDAV_USER = 'user'
    // pass 缺失
    expect(isWebDavConfigured()).toBe(false)
  })

  test('三个 env 都设置时,isWebDavConfigured 返回 true', () => {
    process.env.WEBDAV_URL = 'https://dav.example.com'
    process.env.WEBDAV_USER = 'user'
    process.env.WEBDAV_PASS = 'pass'
    expect(isWebDavConfigured()).toBe(true)
  })

  test('空字符串视为未配置', () => {
    process.env.WEBDAV_URL = ''
    process.env.WEBDAV_USER = ''
    process.env.WEBDAV_PASS = ''
    expect(isWebDavConfigured()).toBe(false)
  })

  test('未配置时 requireWebDavClient 抛出明确错误', () => {
    expect(() => requireWebDavClient()).toThrow(/WebDAV 未配置/)
  })
})

describe('path.joinPath 边界', () => {
  test('多段拼接自动去除多余斜杠', () => {
    expect(joinPath('a', 'b', 'c')).toBe('a/b/c')
    expect(joinPath('/a/', '/b/', 'c')).toBe('a/b/c')
    expect(joinPath('\\a\\', '\\b\\')).toBe('a/b')
  })

  test('空段被忽略', () => {
    expect(joinPath('a', '', 'b')).toBe('a/b')
    expect(joinPath('', '')).toBe('')
  })

  test('单段返回该段', () => {
    expect(joinPath('a')).toBe('a')
    expect(joinPath('/a/')).toBe('a')
  })
})

describe('path.isValidPath 校验', () => {
  test('合法路径', () => {
    expect(isValidPath('covers')).toBe(true)
    expect(isValidPath('covers/2024/img.png')).toBe(true)
    expect(isValidPath('中文/路径.png')).toBe(true)
  })

  test('拒绝 .. 段', () => {
    expect(isValidPath('a/../b')).toBe(false)
    expect(isValidPath('../etc/passwd')).toBe(false)
    expect(isValidPath('..')).toBe(false)
  })

  test('拒绝 . 段', () => {
    expect(isValidPath('a/./b')).toBe(false)
    expect(isValidPath('.')).toBe(false)
  })

  test('拒绝绝对路径', () => {
    expect(isValidPath('/etc/passwd')).toBe(false)
    expect(isValidPath('\\windows\\system32')).toBe(false)
  })

  test('拒绝空字符串', () => {
    expect(isValidPath('')).toBe(false)
  })

  test('拒绝控制字符', () => {
    expect(isValidPath('a/b\x00c')).toBe(false)
    expect(isValidPath('a\nb')).toBe(false)
  })
})

describe('path.encodeFilePath 编码', () => {
  test('保留 / 分隔符', () => {
    expect(encodeFilePath('a/b/c')).toBe('a/b/c')
  })

  test('编码中文与空格', () => {
    expect(encodeFilePath('中文 文件.png')).toBe('%E4%B8%AD%E6%96%87%20%E6%96%87%E4%BB%B6.png')
  })

  test('空字符串返回空字符串', () => {
    expect(encodeFilePath('')).toBe('')
  })

  test('编码特殊字符', () => {
    expect(encodeFilePath('a#b.png')).toBe('a%23b.png')
    expect(encodeFilePath('a?b.png')).toBe('a%3Fb.png')
  })
})

describe('path.splitDirFilename 拆分', () => {
  test('多段路径', () => {
    expect(splitDirFilename('a/b/c.txt')).toEqual({ dir: 'a/b', filename: 'c.txt' })
  })

  test('单段路径(无目录)', () => {
    expect(splitDirFilename('c.txt')).toEqual({ dir: '', filename: 'c.txt' })
  })

  test('空字符串', () => {
    expect(splitDirFilename('')).toEqual({ dir: '', filename: '' })
  })

  test('首尾斜杠先规范化', () => {
    expect(splitDirFilename('/a/b/')).toEqual({ dir: 'a', filename: 'b' })
  })
})

describe('acl.normalizePath 边界', () => {
  test('去除首尾斜杠', () => {
    expect(normalizePath('/a/b/')).toBe('a/b')
    expect(normalizePath('a/b')).toBe('a/b')
  })

  test('仅含斜杠 → 空字符串', () => {
    expect(normalizePath('///')).toBe('')
    expect(normalizePath('\\\\')).toBe('')
  })

  test('空字符串保持空', () => {
    expect(normalizePath('')).toBe('')
  })

  test('中间斜杠保留', () => {
    expect(normalizePath('/a/b/c/')).toBe('a/b/c')
  })
})

describe('acl.getTopLevelFolder 边界', () => {
  test('多段路径取首段', () => {
    expect(getTopLevelFolder('covers/2024/img.png')).toBe('covers')
  })

  test('单段文件 → 空字符串(根级)', () => {
    expect(getTopLevelFolder('img.png')).toBe('')
  })

  test('空 → 空', () => {
    expect(getTopLevelFolder('')).toBe('')
  })

  test('前缀斜杠先规范化', () => {
    expect(getTopLevelFolder('/covers/2024')).toBe('covers')
  })
})
