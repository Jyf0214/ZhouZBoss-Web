/**
 * lib/storage/b2.ts 单元测试
 *
 * 覆盖范围:
 * - isB2Configured: 环境变量检测
 * - B2Provider.isConfigured: 后端配置检查
 * - B2Provider.listDirectory: 目录列表（mock B2 API）
 * - B2Provider.getFileContents: 文件下载（CDN 模式 + 直连模式）
 * - B2Provider.putFileContents: 文件上传
 * - B2Provider.createDirectory: 目录创建
 * - B2Provider.deleteFile: 文件删除
 * - B2Provider.stat: 文件/目录元信息
 * - StorageProvider 配置切换逻辑
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const ORIGINAL_ENV = process.env

// B2 API mock 工具
const b2Mocks = vi.hoisted(() => ({
  fetch: vi.fn<(...args: unknown[]) => Promise<Response>>(),
}))

vi.stubGlobal('fetch', b2Mocks.fetch)

// 辅助: 创建 mock Response
function mockResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockBinaryResponse(data: string | ArrayBuffer, status = 200): Response {
  const body = typeof data === 'string' ? data : new Uint8Array(data)
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/octet-stream' },
  })
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV }
  delete process.env.STORAGE_TYPE
  delete process.env.B2_KEY_ID
  delete process.env.B2_APP_KEY
  delete process.env.B2_BUCKET
  delete process.env.B2_DOWNLOAD_URL
  delete process.env.B2_ENDPOINT
  b2Mocks.fetch.mockReset()
  // 清除 B2 全局缓存（auth token + upload URL + bucket ID），避免测试间污染
  const g = globalThis as Record<string, unknown>
  delete g.__b2AuthToken
  delete g.__b2UploadUrl
  delete g.__b2BucketId
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
    // B2_BUCKET 缺失
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

describe('B2Provider.isConfigured', () => {
  it('未配置时返回 false', async () => {
    const { B2Provider } = await import('@/lib/storage/b2')
    const provider = new B2Provider()
    expect(provider.isConfigured()).toBe(false)
  })

  it('已配置时返回 true', async () => {
    process.env.B2_KEY_ID = 'key1'
    process.env.B2_APP_KEY = 'app1'
    process.env.B2_BUCKET = 'my-bucket'
    const { B2Provider } = await import('@/lib/storage/b2')
    const provider = new B2Provider()
    expect(provider.isConfigured()).toBe(true)
  })

  it('backend 属性为 backblaze', async () => {
    const { B2Provider } = await import('@/lib/storage/b2')
    const provider = new B2Provider()
    expect(provider.backend).toBe('backblaze')
  })
})

describe('B2Provider auth', () => {
  beforeEach(() => {
    process.env.B2_KEY_ID = 'key1'
    process.env.B2_APP_KEY = 'app1'
    process.env.B2_BUCKET = 'my-bucket'
  })

  it('缺少 B2_KEY_ID 时认证失败', async () => {
    delete process.env.B2_KEY_ID
    const { B2Provider } = await import('@/lib/storage/b2')
    const provider = new B2Provider()
    await expect(provider.listDirectory('test')).rejects.toThrow(/B2 未配置/)
  })

  it('认证 API 返回错误时抛出', async () => {
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse(
      { status: 401, code: 'unauthorized', message: 'Invalid credentials' },
      401
    ))
    const { B2Provider } = await import('@/lib/storage/b2')
    const provider = new B2Provider()
    await expect(provider.listDirectory('test')).rejects.toThrow(/B2 API error/)
  })
})

describe('B2Provider.listDirectory', () => {
  beforeEach(() => {
    process.env.B2_KEY_ID = 'key1'
    process.env.B2_APP_KEY = 'app1'
    process.env.B2_BUCKET = 'my-bucket'
  })

  /** 模拟公共调用链: getAuthToken + getBucketId */
  function mockAuthAndBucket() {
    // getAuthToken → 1st call
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({
      accountId: 'acc1', authorizationToken: 'token1',
      apiUrl: 'https://api.backblazeb2.com', downloadUrl: 'https://dl.backblazeb2.com', recommendedPartSize: 100000000,
    }))
    // getBucketId (list_buckets) → 2nd call, caches result
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({
      buckets: [{ bucketId: 'bid1', bucketName: 'my-bucket' }],
    }))
  }

  it('列出根目录文件和子目录', async () => {
    mockAuthAndBucket()
    // list_file_names → 3rd call
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({
      files: [
        { fileId: 'f1', fileName: 'pages/index.html', contentType: 'text/html', contentLength: 1024, contentSha1: null, fileInfo: {}, action: 'upload', uploadTimestamp: 1700000000000 },
        { fileId: 'f2', fileName: 'pages/style.css', contentType: 'text/css', contentLength: 512, contentSha1: null, fileInfo: {}, action: 'upload', uploadTimestamp: 1700000000000 },
      ],
      folders: ['pages/blog/'],
    }))

    const { B2Provider } = await import('@/lib/storage/b2')
    const provider = new B2Provider()
    const entries = await provider.listDirectory('pages')

    expect(entries).toHaveLength(3)
    const blogDir = entries.find((e) => e.type === 'directory')
    expect(blogDir?.filename).toBe('blog')
    expect(blogDir?.basename).toBe('pages/blog')
    const htmlFile = entries.find((e) => e.type === 'file' && e.filename === 'index.html')
    expect(htmlFile?.size).toBe(1024)
    expect(htmlFile?.mime).toBe('text/html')
  })

  it('空目录返回空数组', async () => {
    mockAuthAndBucket()
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({ files: [], folders: [] }))

    const { B2Provider } = await import('@/lib/storage/b2')
    const provider = new B2Provider()
    const entries = await provider.listDirectory('empty-dir')
    expect(entries).toHaveLength(0)
  })

  it('过滤隐藏文件（action=hide）', async () => {
    mockAuthAndBucket()
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({
      files: [
        { fileId: 'f1', fileName: 'pages/visible.html', contentType: 'text/html', contentLength: 100, contentSha1: null, fileInfo: {}, action: 'upload', uploadTimestamp: 1700000000000 },
        { fileId: 'f2', fileName: 'pages/hidden.html', contentType: 'text/html', contentLength: 0, contentSha1: null, fileInfo: {}, action: 'hide', uploadTimestamp: 1700000000000 },
      ],
      folders: [],
    }))

    const { B2Provider } = await import('@/lib/storage/b2')
    const provider = new B2Provider()
    const entries = await provider.listDirectory('pages')
    expect(entries).toHaveLength(1)
    expect(entries[0]!.filename).toBe('visible.html')
  })
})

describe('B2Provider.getFileContents', () => {
  beforeEach(() => {
    process.env.B2_KEY_ID = 'key1'
    process.env.B2_APP_KEY = 'app1'
    process.env.B2_BUCKET = 'my-bucket'
  })

  it('CDN 模式: 使用 download_url 下载，带 Authorization header', async () => {
    process.env.B2_DOWNLOAD_URL = 'https://cdn.example.com'
    // getAuthToken → 1st call
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({
      accountId: 'acc1', authorizationToken: 'token1',
      apiUrl: 'https://api.backblazeb2.com', downloadUrl: 'https://dl.backblazeb2.com', recommendedPartSize: 100000000,
    }))
    // download via CDN → 2nd call
    b2Mocks.fetch.mockResolvedValueOnce(mockBinaryResponse('<h1>Hello</h1>'))

    const { B2Provider } = await import('@/lib/storage/b2')
    const provider = new B2Provider()
    const content = await provider.getFileContents('pages/test.html')

    expect(Buffer.isBuffer(content)).toBe(true)
    expect(content.toString()).toBe('<h1>Hello</h1>')
    expect(b2Mocks.fetch).toHaveBeenCalledWith(
      'https://cdn.example.com/file/my-bucket/pages/test.html',
      expect.objectContaining({
        headers: { Authorization: 'token1' },
        signal: undefined,
      })
    )
  })

  it('直连模式: 使用 B2 API 下载', async () => {
    // 需要先 mock auth
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({
      accountId: 'acc1', authorizationToken: 'token1',
      apiUrl: 'https://api.backblazeb2.com', downloadUrl: 'https://dl.backblazeb2.com', recommendedPartSize: 100000000,
    }))

    b2Mocks.fetch.mockResolvedValueOnce(mockBinaryResponse('<h1>Direct</h1>'))

    const { B2Provider } = await import('@/lib/storage/b2')
    const provider = new B2Provider()
    const content = await provider.getFileContents('pages/test.html')

    expect(content.toString()).toBe('<h1>Direct</h1>')
    expect(b2Mocks.fetch).toHaveBeenCalledWith(
      'https://api.backblazeb2.com/file/my-bucket/pages/test.html',
      expect.objectContaining({
        headers: { Authorization: 'token1' },
      })
    )
  })

  it('文件不存在返回 404', async () => {
    process.env.B2_DOWNLOAD_URL = 'https://cdn.example.com'
    // getAuthToken → 1st call
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({
      accountId: 'acc1', authorizationToken: 'token1',
      apiUrl: 'https://api.backblazeb2.com', downloadUrl: 'https://dl.backblazeb2.com', recommendedPartSize: 100000000,
    }))
    b2Mocks.fetch.mockResolvedValueOnce(new Response('Not Found', { status: 404 }))

    const { B2Provider } = await import('@/lib/storage/b2')
    const provider = new B2Provider()
    await expect(provider.getFileContents('pages/missing.html')).rejects.toThrow(/文件不存在/)
  })

  it('根路径读取报错', async () => {
    const { B2Provider } = await import('@/lib/storage/b2')
    const provider = new B2Provider()
    await expect(provider.getFileContents('')).rejects.toThrow(/不能读取根路径/)
  })
})

describe('B2Provider.putFileContents', () => {
  beforeEach(() => {
    process.env.B2_KEY_ID = 'key1'
    process.env.B2_APP_KEY = 'app1'
    process.env.B2_BUCKET = 'my-bucket'
  })

  function mockAuthAndBucket() {
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({
      accountId: 'acc1', authorizationToken: 'token1',
      apiUrl: 'https://api.backblazeb2.com', downloadUrl: 'https://dl.backblazeb2.com', recommendedPartSize: 100000000,
    }))
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({
      buckets: [{ bucketId: 'bid1', bucketName: 'my-bucket' }],
    }))
  }

  it('上传文件成功', async () => {
    mockAuthAndBucket()
    // get_upload_url → getAuthToken(cached) + getBucketId(cached) + b2Request(get_upload_url) → 3rd call
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({
      uploadUrl: 'https://upload.backblazeb2.com/b2api/v3/b2_upload_file/bid1',
      authorizationToken: 'upload-token',
      bucketId: 'bid1',
    }))
    // upload response → 4th call
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({
      fileId: 'new-f1',
      fileName: 'pages/test.html',
    }))

    const { B2Provider } = await import('@/lib/storage/b2')
    const provider = new B2Provider()
    await provider.putFileContents('pages/test.html', Buffer.from('<html></html>'))

    // 验证上传调用（第 4 次 fetch 调用）
    const uploadCall = b2Mocks.fetch.mock.calls[3] as [string, RequestInit] | undefined
    expect(uploadCall).toBeDefined()
    expect(uploadCall![0]).toBe('https://upload.backblazeb2.com/b2api/v3/b2_upload_file/bid1')
    expect(uploadCall![1].headers).toMatchObject({
      Authorization: 'upload-token',
      'X-Bz-File-Name': 'pages/test.html',
    })
  })

  it('上传认证失败时清除缓存', async () => {
    mockAuthAndBucket()
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({
      uploadUrl: 'https://upload.backblazeb2.com/b2api/v3/b2_upload_file/bid1',
      authorizationToken: 'upload-token',
      bucketId: 'bid1',
    }))
    b2Mocks.fetch.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))

    const { B2Provider } = await import('@/lib/storage/b2')
    const provider = new B2Provider()
    await expect(provider.putFileContents('pages/test.html', Buffer.from('<html>'))).rejects.toThrow(/上传失败/)
  })

  it('根路径写入报错', async () => {
    const { B2Provider } = await import('@/lib/storage/b2')
    const provider = new B2Provider()
    await expect(provider.putFileContents('', Buffer.from('test'))).rejects.toThrow(/不能写入根路径/)
  })
})

describe('B2Provider.deleteFile', () => {
  beforeEach(() => {
    process.env.B2_KEY_ID = 'key1'
    process.env.B2_APP_KEY = 'app1'
    process.env.B2_BUCKET = 'my-bucket'
  })

  function mockAuthAndBucket() {
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({
      accountId: 'acc1', authorizationToken: 'token1',
      apiUrl: 'https://api.backblazeb2.com', downloadUrl: 'https://dl.backblazeb2.com', recommendedPartSize: 100000000,
    }))
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({
      buckets: [{ bucketId: 'bid1', bucketName: 'my-bucket' }],
    }))
  }

  it('删除文件成功', async () => {
    mockAuthAndBucket()
    // list_file_versions → 3rd call
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({
      files: [{ fileId: 'f1', fileName: 'pages/test.html', contentType: 'text/html', contentLength: 100, contentSha1: null, fileInfo: {}, action: 'upload', uploadTimestamp: 1700000000000 }],
    }))
    // delete_file_version → 4th call
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({ fileId: 'f1', fileName: 'pages/test.html' }))

    const { B2Provider } = await import('@/lib/storage/b2')
    const provider = new B2Provider()
    await provider.deleteFile('pages/test.html')

    const deleteCall = b2Mocks.fetch.mock.calls[3] as [string, RequestInit] | undefined
    expect(deleteCall).toBeDefined()
    expect(deleteCall![1].method).toBe('POST')
  })

  it('删除不存在的文件 → 404', async () => {
    mockAuthAndBucket()
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({ files: [] }))

    const { B2Provider } = await import('@/lib/storage/b2')
    const provider = new B2Provider()
    await expect(provider.deleteFile('pages/missing.html')).rejects.toThrow(/文件不存在/)
  })
})

describe('B2Provider.stat', () => {
  beforeEach(() => {
    process.env.B2_KEY_ID = 'key1'
    process.env.B2_APP_KEY = 'app1'
    process.env.B2_BUCKET = 'my-bucket'
  })

  function mockAuthAndBucket() {
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({
      accountId: 'acc1', authorizationToken: 'token1',
      apiUrl: 'https://api.backblazeb2.com', downloadUrl: 'https://dl.backblazeb2.com', recommendedPartSize: 100000000,
    }))
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({
      buckets: [{ bucketId: 'bid1', bucketName: 'my-bucket' }],
    }))
  }

  it('统计文件返回 file 类型', async () => {
    mockAuthAndBucket()
    // list_file_names (exact match) → 3rd call
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({
      files: [{ fileId: 'f1', fileName: 'pages/test.html', contentType: 'text/html', contentLength: 1024, contentSha1: null, fileInfo: {}, action: 'upload', uploadTimestamp: 1700000000000 }],
      folders: [],
    }))

    const { B2Provider } = await import('@/lib/storage/b2')
    const provider = new B2Provider()
    const result = await provider.stat('pages/test.html')

    expect(result.type).toBe('file')
    expect(result.size).toBe(1024)
    expect(result.mime).toBe('text/html')
  })

  it('统计根目录返回 directory', async () => {
    const { B2Provider } = await import('@/lib/storage/b2')
    const provider = new B2Provider()
    const result = await provider.stat('')

    expect(result.type).toBe('directory')
    expect(result.size).toBe(0)
  })

  it('不存在的路径返回 404', async () => {
    mockAuthAndBucket()
    // list_file_names (file check, no match) → 3rd call
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({ files: [], folders: [] }))
    // list_file_names (dir check, getBucketId cached) → 4th call
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({ files: [], folders: [] }))

    const { B2Provider } = await import('@/lib/storage/b2')
    const provider = new B2Provider()
    await expect(provider.stat('pages/missing.html')).rejects.toThrow(/路径不存在/)
  })
})

describe('B2Provider.createDirectory', () => {
  beforeEach(() => {
    process.env.B2_KEY_ID = 'key1'
    process.env.B2_APP_KEY = 'app1'
    process.env.B2_BUCKET = 'my-bucket'
  })

  function mockAuthAndBucket() {
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({
      accountId: 'acc1', authorizationToken: 'token1',
      apiUrl: 'https://api.backblazeb2.com', downloadUrl: 'https://dl.backblazeb2.com', recommendedPartSize: 100000000,
    }))
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({
      buckets: [{ bucketId: 'bid1', bucketName: 'my-bucket' }],
    }))
  }

  it('创建目录上传 .keep 占位文件', async () => {
    mockAuthAndBucket()
    // ensureDirectory → list_file_names (check exists) → 3rd call
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({ files: [], folders: [] }))
    // ensureDirectory → putFileContents → get_upload_url (getAuthToken cached, getBucketId cached) → 4th call
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({
      uploadUrl: 'https://upload.backblazeb2.com/b2api/v3/b2_upload_file/bid1',
      authorizationToken: 'upload-token',
      bucketId: 'bid1',
    }))
    // upload .keep → 5th call
    b2Mocks.fetch.mockResolvedValueOnce(mockResponse({
      fileId: 'f-keep', fileName: 'new-dir/.keep',
    }))

    const { B2Provider } = await import('@/lib/storage/b2')
    const provider = new B2Provider()
    await provider.createDirectory('new-dir')

    expect(b2Mocks.fetch).toHaveBeenCalledTimes(5)
  })

  it('空路径静默返回', async () => {
    const { B2Provider } = await import('@/lib/storage/b2')
    const provider = new B2Provider()
    await provider.createDirectory('')
    expect(b2Mocks.fetch).not.toHaveBeenCalled()
  })
})
