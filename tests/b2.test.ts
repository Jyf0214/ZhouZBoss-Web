/**
 * lib/storage/b2.ts 单元测试
 *
 * 覆盖范围（基于 @aws-sdk/client-s3）:
 * - isB2Configured: 环境变量检测
 * - B2Provider.isConfigured / backend 属性
 * - B2Provider.listDirectory: 目录列表（mock S3 SDK）
 * - B2Provider.getFileContents: 文件下载（CDN + 直连）
 * - B2Provider.putFileContents: 文件上传
 * - B2Provider.createDirectory: 目录创建
 * - B2Provider.deleteFile: 文件删除
 * - B2Provider.deleteDirectory: 目录删除
 * - B2Provider.moveFile: 移动/重命名
 * - B2Provider.stat: 文件/目录元信息
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const ORIGINAL_ENV = process.env

// S3 SDK mock
const s3Mocks = vi.hoisted(() => ({
  send: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}))

// fetch mock（仅用于 B2 鉴权获取 S3 endpoint）
const fetchMocks = vi.hoisted(() => ({
  fetch: vi.fn<(...args: unknown[]) => Promise<Response>>(),
}))

vi.stubGlobal('fetch', fetchMocks.fetch)

// Mock S3Client（必须用 class 形式才能支持 new）
vi.mock('@aws-sdk/client-s3', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  class MockS3Client {
    send = s3Mocks.send
  }
  return {
    ...actual,
    S3Client: MockS3Client,
    paginateListObjectsV2: vi.fn(),
  }
})

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV }
  delete process.env.STORAGE_TYPE
  delete process.env.B2_KEY_ID
  delete process.env.B2_APP_KEY
  delete process.env.B2_BUCKET
  delete process.env.B2_DOWNLOAD_URL
  delete process.env.B2_S3_ENDPOINT
  s3Mocks.send.mockReset()
  fetchMocks.fetch.mockReset()
  // 清除全局缓存
  const g = globalThis as Record<string, unknown>
  delete g.__b2Auth
  delete g.__b2S3Client
  delete g.__b2S3Endpoint
})

afterEach(() => {
  process.env = ORIGINAL_ENV
  vi.restoreAllMocks()
})

describe('isB2Configured', () => {
  it('三个 env 都未设置时返回 false', async () => {
    const { isB2Configured } = await import('@/lib/storage/b2')
    expect(isB2Configured()).toBe(false)
  })

  it('只设置部分 env 时返回 false', async () => {
    process.env.B2_KEY_ID = 'key1'
    process.env.B2_APP_KEY = 'app1'
    const { isB2Configured } = await import('@/lib/storage/b2')
    expect(isB2Configured()).toBe(false)
  })

  it('三个 env 都设置时返回 true', async () => {
    process.env.B2_KEY_ID = 'key1'
    process.env.B2_APP_KEY = 'app1'
    process.env.B2_BUCKET = 'my-bucket'
    const { isB2Configured } = await import('@/lib/storage/b2')
    expect(isB2Configured()).toBe(true)
  })

  it('空字符串视为未配置', async () => {
    process.env.B2_KEY_ID = ''
    process.env.B2_APP_KEY = ''
    process.env.B2_BUCKET = ''
    const { isB2Configured } = await import('@/lib/storage/b2')
    expect(isB2Configured()).toBe(false)
  })
})

describe('B2Provider.isConfigured / backend', () => {
  it('未配置时返回 false', async () => {
    const { B2Provider } = await import('@/lib/storage/b2')
    expect(new B2Provider().isConfigured()).toBe(false)
  })

  it('已配置时返回 true', async () => {
    process.env.B2_KEY_ID = 'key1'
    process.env.B2_APP_KEY = 'app1'
    process.env.B2_BUCKET = 'my-bucket'
    const { B2Provider } = await import('@/lib/storage/b2')
    expect(new B2Provider().isConfigured()).toBe(true)
  })

  it('backend 为 backblaze', async () => {
    const { B2Provider } = await import('@/lib/storage/b2')
    expect(new B2Provider().backend).toBe('backblaze')
  })
})

describe('B2Provider auth', () => {
  it('缺少 B2_KEY_ID 时认证失败', async () => {
    process.env.B2_APP_KEY = 'app1'
    process.env.B2_BUCKET = 'my-bucket'
    // 需要 mock fetch 以触发鉴权
    fetchMocks.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      error: 'missing key',
    }), { status: 401 }))
    const { B2Provider } = await import('@/lib/storage/b2')
    await expect(new B2Provider().listDirectory('test')).rejects.toThrow(/B2 未配置/)
  })

  it('鉴权 API 返回错误时抛出', async () => {
    process.env.B2_KEY_ID = 'key1'
    process.env.B2_APP_KEY = 'app1'
    process.env.B2_BUCKET = 'my-bucket'
    fetchMocks.fetch.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
    const { B2Provider } = await import('@/lib/storage/b2')
    await expect(new B2Provider().listDirectory('test')).rejects.toThrow(/鉴权失败/)
  })
})

describe('B2Provider.listDirectory', () => {
  beforeEach(() => {
    process.env.B2_KEY_ID = 'key1'
    process.env.B2_APP_KEY = 'app1'
    process.env.B2_BUCKET = 'my-bucket'
    process.env.B2_S3_ENDPOINT = 'https://s3.backblazeb2.com'
  })

  it('列出子目录的文件和子目录', async () => {
    s3Mocks.send.mockResolvedValueOnce({
      CommonPrefixes: [{ Prefix: 'pages/blog/' }],
      Contents: [
        { Key: 'pages/index.html', Size: 1024, LastModified: new Date('2024-01-01'), ETag: '"abc"' },
        { Key: 'pages/style.css', Size: 512, LastModified: new Date('2024-01-01'), ETag: '"def"' },
      ],
      KeyCount: 3,
      NextContinuationToken: undefined,
      IsTruncated: false,
    })

    const { B2Provider } = await import('@/lib/storage/b2')
    const entries = await new B2Provider().listDirectory('pages')

    expect(entries).toHaveLength(3)
    const blogDir = entries.find((e) => e.type === 'directory')
    expect(blogDir?.filename).toBe('blog')
    expect(blogDir?.basename).toBe('pages/blog')
    const htmlFile = entries.find((e) => e.type === 'file' && e.filename === 'index.html')
    expect(htmlFile?.size).toBe(1024)
  })

  it('空目录返回空数组', async () => {
    s3Mocks.send.mockResolvedValueOnce({
      CommonPrefixes: [],
      Contents: [],
      KeyCount: 0,
      IsTruncated: false,
    })

    const { B2Provider } = await import('@/lib/storage/b2')
    const entries = await new B2Provider().listDirectory('empty-dir')
    expect(entries).toHaveLength(0)
  })

  it('根目录列出顶层文件和目录', async () => {
    s3Mocks.send.mockResolvedValueOnce({
      CommonPrefixes: [{ Prefix: 'pages/' }],
      Contents: [
        { Key: 'readme.txt', Size: 100, LastModified: new Date('2024-01-01'), ETag: '"xyz"' },
      ],
      KeyCount: 2,
      IsTruncated: false,
    })

    const { B2Provider } = await import('@/lib/storage/b2')
    const entries = await new B2Provider().listDirectory('')

    expect(entries).toHaveLength(2)
    const pagesDir = entries.find((e) => e.type === 'directory')
    expect(pagesDir?.filename).toBe('pages')
    const readmeFile = entries.find((e) => e.type === 'file')
    expect(readmeFile?.filename).toBe('readme.txt')
  })

  it('B2 虚拟目录标记转换为目录条目', async () => {
    // B2 根目录列表: Contents 中的 pages/ 是虚拟目录标记
    // （与 CommonPrefixes 不同，B2 在某些情况下将目录放在 Contents 中）
    s3Mocks.send.mockResolvedValueOnce({
      CommonPrefixes: [],
      Contents: [
        { Key: 'pages/', Size: 0, LastModified: new Date(), ETag: 'null' },
      ],
      KeyCount: 1,
      IsTruncated: false,
    })

    const { B2Provider } = await import('@/lib/storage/b2')
    const entries = await new B2Provider().listDirectory('')
    expect(entries).toHaveLength(1)
    expect(entries[0]!.type).toBe('directory')
    expect(entries[0]!.filename).toBe('pages')
  })
})

describe('B2Provider.getFileContents', () => {
  beforeEach(() => {
    process.env.B2_KEY_ID = 'key1'
    process.env.B2_APP_KEY = 'app1'
    process.env.B2_BUCKET = 'my-bucket'
    process.env.B2_S3_ENDPOINT = 'https://s3.backblazeb2.com'
  })

  it('直连模式: 通过 S3 SDK 下载', async () => {
    s3Mocks.send.mockResolvedValueOnce({
      Body: { transformToByteArray: () => Promise.resolve(Buffer.from('<h1>Hello</h1>')) },
      ContentType: 'text/html',
      ContentLength: 13,
    })

    const { B2Provider } = await import('@/lib/storage/b2')
    const content = await new B2Provider().getFileContents('pages/test.html')

    expect(Buffer.isBuffer(content)).toBe(true)
    expect(content.toString()).toBe('<h1>Hello</h1>')
  })

  it('CDN 模式: 通过 HTTP handler 走 CDN', async () => {
    process.env.B2_DOWNLOAD_URL = 'https://cdn.example.com'

    // CDN 模式下 SDK 会把 requestHandler 传给 send，
    // mock send 需要提取 options 中的 requestHandler 并执行
    s3Mocks.send.mockImplementationOnce(async (...args: unknown[]) => {
      const options = args[1] as Record<string, unknown> | undefined
      const rh = (options?.requestHandler as { handle: (req: unknown) => Promise<unknown> }) ?? undefined
      if (rh) {
        await rh.handle({
          httpRequest: {
            hostname: 's3.backblazeb2.com',
            path: '/my-bucket/pages/test.html',
            headers: { Authorization: 'token1' },
            method: 'GET',
            protocol: 'https:',
          },
          output: {},
        })
      }
      return {
        Body: { transformToByteArray: () => Promise.resolve(Buffer.from('<h1>CDN</h1>')) },
      }
    })

    fetchMocks.fetch.mockResolvedValueOnce(new Response(Buffer.from('<h1>CDN</h1>'), {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }))

    const { B2Provider } = await import('@/lib/storage/b2')
    const content = await new B2Provider().getFileContents('pages/test.html')

    expect(content.toString()).toBe('<h1>CDN</h1>')
    expect(fetchMocks.fetch).toHaveBeenCalledWith(
      'https://cdn.example.com/file/my-bucket/pages/test.html',
      expect.objectContaining({
        headers: expect.any(Object),
      })
    )
  })

  it('文件不存在返回 404', async () => {
    process.env.B2_DOWNLOAD_URL = 'https://cdn.example.com'

    fetchMocks.fetch.mockResolvedValueOnce(new Response('Not Found', { status: 404 }))

    const { B2Provider } = await import('@/lib/storage/b2')
    await expect(new B2Provider().getFileContents('pages/missing.html')).rejects.toThrow()
  })

  it('根路径读取报错', async () => {
    const { B2Provider } = await import('@/lib/storage/b2')
    await expect(new B2Provider().getFileContents('')).rejects.toThrow(/不能读取根路径/)
  })
})

describe('B2Provider.putFileContents', () => {
  beforeEach(() => {
    process.env.B2_KEY_ID = 'key1'
    process.env.B2_APP_KEY = 'app1'
    process.env.B2_BUCKET = 'my-bucket'
    process.env.B2_S3_ENDPOINT = 'https://s3.backblazeb2.com'
  })

  it('上传文件成功', async () => {
    s3Mocks.send.mockResolvedValueOnce({})

    const { B2Provider } = await import('@/lib/storage/b2')
    await new B2Provider().putFileContents('pages/test.html', Buffer.from('<html></html>'))

    expect(s3Mocks.send).toHaveBeenCalledTimes(1)
    const cmd = s3Mocks.send.mock.calls[0]![0] as { input: Record<string, unknown> }
    expect(cmd.input).toMatchObject({
      Bucket: 'my-bucket',
      Key: 'pages/test.html',
      ContentType: 'text/html',
    })
  })

  it('上传空路径报错', async () => {
    const { B2Provider } = await import('@/lib/storage/b2')
    await expect(new B2Provider().putFileContents('', Buffer.from('test'))).rejects.toThrow(/不能写入根路径/)
  })
})

describe('B2Provider.createDirectory', () => {
  beforeEach(() => {
    process.env.B2_KEY_ID = 'key1'
    process.env.B2_APP_KEY = 'app1'
    process.env.B2_BUCKET = 'my-bucket'
    process.env.B2_S3_ENDPOINT = 'https://s3.backblazeb2.com'
  })

  it('创建目录（上传 .keep 占位文件）', async () => {
    // ensureDirectory → ListObjects（检查是否已存在）
    s3Mocks.send.mockResolvedValueOnce({ KeyCount: 0, Contents: [], IsTruncated: false })
    // putFileContents → PutObject（上传 .keep）
    s3Mocks.send.mockResolvedValueOnce({})

    const { B2Provider } = await import('@/lib/storage/b2')
    await new B2Provider().createDirectory('new-folder')

    expect(s3Mocks.send).toHaveBeenCalledTimes(2)
    // 第二次调用是 PutObject
    const putCmd = s3Mocks.send.mock.calls[1]![0] as { input: Record<string, unknown> }
    expect(putCmd.input.Key).toBe('new-folder/.keep')
  })

  it('递归创建目录', async () => {
    // 每级目录: ListObjects(不存在) + PutObject(.keep) = 2 次调用
    s3Mocks.send.mockResolvedValue({ KeyCount: 0, Contents: [], IsTruncated: false })

    const { B2Provider } = await import('@/lib/storage/b2')
    await new B2Provider().createDirectory('a/b/c', { recursive: true })

    // a, a/b, a/b/c 三级 → 3 × 2 = 6 次调用
    expect(s3Mocks.send).toHaveBeenCalledTimes(6)
  })
})

describe('B2Provider.deleteFile', () => {
  beforeEach(() => {
    process.env.B2_KEY_ID = 'key1'
    process.env.B2_APP_KEY = 'app1'
    process.env.B2_BUCKET = 'my-bucket'
    process.env.B2_S3_ENDPOINT = 'https://s3.backblazeb2.com'
  })

  it('删除文件成功', async () => {
    s3Mocks.send.mockResolvedValueOnce({})

    const { B2Provider } = await import('@/lib/storage/b2')
    await new B2Provider().deleteFile('pages/old.html')

    expect(s3Mocks.send).toHaveBeenCalledTimes(1)
    const cmd = s3Mocks.send.mock.calls[0]![0] as { input: Record<string, unknown> }
    expect(cmd.input).toMatchObject({ Bucket: 'my-bucket', Key: 'pages/old.html' })
  })

  it('删除空路径报错', async () => {
    const { B2Provider } = await import('@/lib/storage/b2')
    await expect(new B2Provider().deleteFile('')).rejects.toThrow(/不能删除根路径/)
  })
})

describe('B2Provider.deleteDirectory', () => {
  beforeEach(() => {
    process.env.B2_KEY_ID = 'key1'
    process.env.B2_APP_KEY = 'app1'
    process.env.B2_BUCKET = 'my-bucket'
    process.env.B2_S3_ENDPOINT = 'https://s3.backblazeb2.com'
  })

  it('递归删除目录下所有文件', async () => {
    // Mock paginateListObjectsV2 to return an async iterable
    const { paginateListObjectsV2 } = await import('@aws-sdk/client-s3')
    const mockPaginator = (async function* () {
      await Promise.resolve()
      yield {
        Contents: [
          { Key: 'dir/file1.html' },
          { Key: 'dir/file2.css' },
          { Key: 'dir/.keep' },
        ],
        IsTruncated: false,
      }
    })()
    vi.mocked(paginateListObjectsV2).mockReturnValueOnce(mockPaginator as ReturnType<typeof paginateListObjectsV2>)

    // 3 个 DeleteObject 调用
    s3Mocks.send.mockResolvedValue({})

    const { B2Provider } = await import('@/lib/storage/b2')
    await new B2Provider().deleteDirectory('dir')

    // 3 deletes + 1 .keep delete = 4
    expect(s3Mocks.send).toHaveBeenCalledTimes(4)
  })
})

describe('B2Provider.stat', () => {
  beforeEach(() => {
    process.env.B2_KEY_ID = 'key1'
    process.env.B2_APP_KEY = 'app1'
    process.env.B2_BUCKET = 'my-bucket'
    process.env.B2_S3_ENDPOINT = 'https://s3.backblazeb2.com'
  })

  it('文件 stat', async () => {
    s3Mocks.send.mockResolvedValueOnce({
      ContentLength: 1024,
      LastModified: new Date('2024-06-01'),
      ContentType: 'text/html',
      ETag: '"abc"',
    })

    const { B2Provider } = await import('@/lib/storage/b2')
    const result = await new B2Provider().stat('pages/index.html')

    expect(result.type).toBe('file')
    expect(result.size).toBe(1024)
    expect(result.basename).toBe('pages/index.html')
  })

  it('目录 stat', async () => {
    // HeadObject 失败 → 作为目录查询
    s3Mocks.send.mockRejectedValueOnce(new Error('NoSuchKey'))
    s3Mocks.send.mockResolvedValueOnce({
      KeyCount: 2,
      Contents: [{ Key: 'pages/file.html' }],
    })

    const { B2Provider } = await import('@/lib/storage/b2')
    const result = await new B2Provider().stat('pages')

    expect(result.type).toBe('directory')
    expect(result.basename).toBe('pages')
  })

  it('不存在的路径返回 404', async () => {
    s3Mocks.send.mockRejectedValueOnce(new Error('NoSuchKey'))
    s3Mocks.send.mockResolvedValueOnce({ KeyCount: 0, Contents: [] })

    const { B2Provider } = await import('@/lib/storage/b2')
    await expect(new B2Provider().stat('nonexistent')).rejects.toThrow(/路径不存在/)
  })

  it('根目录返回 directory', async () => {
    const { B2Provider } = await import('@/lib/storage/b2')
    const result = await new B2Provider().stat('')

    expect(result.type).toBe('directory')
    expect(result.basename).toBe('')
  })
})

describe('B2Provider.moveFile', () => {
  beforeEach(() => {
    process.env.B2_KEY_ID = 'key1'
    process.env.B2_APP_KEY = 'app1'
    process.env.B2_BUCKET = 'my-bucket'
    process.env.B2_S3_ENDPOINT = 'https://s3.backblazeb2.com'
  })

  it('单文件移动: copy + delete', async () => {
    // isFile → HeadObject 成功（文件存在）
    s3Mocks.send.mockResolvedValueOnce({ ContentLength: 100 })
    // CopyObject
    s3Mocks.send.mockResolvedValueOnce({})
    // DeleteObject
    s3Mocks.send.mockResolvedValueOnce({})

    const { B2Provider } = await import('@/lib/storage/b2')
    await new B2Provider().moveFile('old.txt', 'new.txt')

    expect(s3Mocks.send).toHaveBeenCalledTimes(3)
    const copyCmd = s3Mocks.send.mock.calls[1]![0] as { input: Record<string, unknown> }
    expect(copyCmd.input).toMatchObject({
      Bucket: 'my-bucket',
      CopySource: 'my-bucket/old.txt',
      Key: 'new.txt',
    })
  })

  it('相同路径不执行操作', async () => {
    const { B2Provider } = await import('@/lib/storage/b2')
    await new B2Provider().moveFile('same.txt', 'same.txt')
    expect(s3Mocks.send).not.toHaveBeenCalled()
  })
})
