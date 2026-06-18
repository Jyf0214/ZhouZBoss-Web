/* eslint-disable max-lines */
/**
 * Backblaze B2 存储提供者
 *
 * 实现 StorageProvider 接口，使用 B2 原生 API 操作存储桶。
 *
 * 环境变量:
 * - B2_KEY_ID: B2 应用程序密钥 ID
 * - B2_APP_KEY: B2 应用程序密钥
 * - B2_BUCKET: 存储桶名称
 * - B2_DOWNLOAD_URL: (可选) 自定义下载端点（如 Cloudflare CDN URL）
 *   格式: https://xxx.yyy.zzz （无尾斜杠）
 *   rclone 文档: "The URL provided here SHOULD have the protocol and SHOULD NOT
 *   have a trailing slash or specify the /file/bucket subpath as rclone will
 *   request files with '{download_url}/file/{bucket_name}/{path}'"
 * - B2_ENDPOINT: (可选) 自定义 S3 API 端点
 *   默认: https://{account_id}.s3.{region}.backblazeb2.com
 *
 * 实现说明:
 * - B2 提供 S3 兼容 API，但本实现使用 B2 原生 API（更可靠）
 * - B2 没有原生「目录」概念，用 key 前缀 + '/' 模拟
 * - 删除操作需要先列出文件版本，再删除指定版本
 * - B2 upload 需要先获取上传 URL（带签名，短暂有效）
 *
 * download_url + Cloudflare CDN:
 * - B2 通过 Cloudflare 提供免费出口流量
 * - 设置 download_url 后，下载请求走 CDN 而非 B2 直连
 * - 如果 Cloudflare Worker 重写了认证请求，需要正确处理 Authorization header
 */
import type { FileStat } from 'webdav'
import type {
  StorageProvider,
  ListDirectoryOptions,
  FileContent,
} from './storage-provider'
import { createHash } from 'node:crypto'

/** B2 API 基础 URL */
const B2_API_BASE = 'https://api.backblazeb2.com'

/** 授权令牌缓存 */
interface AuthToken {
  accountId: string
  authorizationToken: string
  apiUrl: string
  downloadUrl: string
  recommendedPartSize: number
}

/** 上传 URL 缓存 */
interface UploadUrl {
  uploadUrl: string
  authorizationToken: string
  bucketId: string
}

/** B2 文件信息（list / info 响应） */
interface B2FileInfo {
  fileId: string
  fileName: string
  contentType: string
  contentLength: number
  contentSha1: string | null
  fileInfo: Record<string, string>
  action: 'upload' | 'hide' | 'folder'
  uploadTimestamp: number
}

/** B2 API 错误 */
interface B2ApiError {
  status: number
  code: string
  message: string
}

/** B2 认证令牌缓存时间戳 */
const AUTH_TOKEN_TTL_MS = 20 * 60 * 60 * 1000; // 20 小时

/** globalThis 缓存（与 lib/webdav.ts 模式一致） */
const globalForB2 = globalThis as unknown as {
  __b2AuthToken?: AuthToken | undefined
  __b2AuthTokenTime?: number | undefined
  __b2UploadUrl?: UploadUrl | undefined
  __b2BucketId?: string | undefined
}

/**
 * 检查 B2 环境变量是否全部配置
 */
export function isB2Configured(): boolean {
  return !!(
    process.env.B2_KEY_ID &&
    process.env.B2_APP_KEY &&
    process.env.B2_BUCKET
  )
}

/**
 * B2 API 请求封装
 *
 * - 自动附加 Authorization header
 * - 非 2xx 响应抛出带 status / code / message 的错误
 */
async function b2Request(
  url: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: string | Buffer | ArrayBuffer | FormData
    authToken?: string
  } = {}
): Promise<Response> {
  const headers: Record<string, string> = { ...options.headers }
  if (options.authToken) {
    headers['Authorization'] = options.authToken
  }

  // Buffer 不是标准 BodyInit，需转为 Uint8Array
  let body: BodyInit | undefined
  if (options.body instanceof Buffer) {
    body = new Uint8Array(options.body)
  } else {
    body = options.body as BodyInit | undefined
  }

  const resp = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body,
  })

  if (!resp.ok) {
    let errorBody: B2ApiError | null = null
    try {
      errorBody = await resp.json() as B2ApiError
    } catch {
      // ignore parse failure
    }
    const err = new Error(
      `B2 API error: ${resp.status} ${errorBody?.code ?? ''} ${errorBody?.message ?? resp.statusText}`
    ) as Error & { status: number; code?: string }
    err.status = resp.status
    err.code = errorBody?.code
    throw err
  }

  return resp
}

/**
 * 解析 B2 authorize 响应，兼容 v3/v4 嵌套格式
 */
function parseAuthorizeResponse(data: Record<string, unknown>): AuthToken {
  const storageApi = (data.apiInfo as Record<string, unknown> | undefined)
    ?.storageApi as Record<string, unknown> | undefined
  const resolvedApiUrl = String(
    data.apiUrl ?? storageApi?.apiUrl ?? data.s3ApiUrl ?? ''
  )
  const resolvedDownloadUrl = String(
    process.env.B2_DOWNLOAD_URL ?? data.downloadUrl ?? storageApi?.downloadUrl ?? ''
  )
  if (!resolvedApiUrl) {
    throw new Error(
      `B2 鉴权响应缺少 apiUrl, 可用字段: ${Object.keys(data).join(', ')}`
    )
  }
  return {
    accountId: String(data.accountId ?? ''),
    authorizationToken: String(data.authorizationToken ?? ''),
    apiUrl: resolvedApiUrl,
    downloadUrl: resolvedDownloadUrl,
    recommendedPartSize: Number(data.recommendedPartSize ?? 100_000_000),
  }
}

/**
 * 获取/刷新 B2 授权令牌
 *
 * B2 认证流程:
 * 1. 使用 Basic Auth（keyId:appKey）调用 /b2api/v3/b2_authorize_account
 * 2. 返回 apiUrl / downloadUrl / authorizationToken
 * 3. 后续请求使用返回的 apiUrl + Bearer token
 *
 * 缓存策略: 令牌有效期通常 24h，这里在 globalThis 缓存
 */
async function getAuthToken(): Promise<AuthToken> {
  const cached = globalForB2.__b2AuthToken
  const cachedTime = globalForB2.__b2AuthTokenTime ?? 0
  if (cached && (Date.now() - cachedTime) < AUTH_TOKEN_TTL_MS) {
    return cached
  }

  const keyId = process.env.B2_KEY_ID
  const appKey = process.env.B2_APP_KEY
  if (!keyId || !appKey) {
    throw new Error('B2 未配置: 请设置 B2_KEY_ID 和 B2_APP_KEY')
  }

  const credentials = Buffer.from(`${keyId}:${appKey}`).toString('base64')
  const resp = await b2Request(`${B2_API_BASE}/b2api/v3/b2_authorize_account`, {
    headers: { Authorization: `Basic ${credentials}` },
  })

  const data = await resp.json() as Record<string, unknown>
  const authToken = parseAuthorizeResponse(data)
  globalForB2.__b2AuthToken = authToken
  globalForB2.__b2AuthTokenTime = Date.now()
  return authToken
}

/**
 * 获取上传 URL（带缓存）
 *
 * B2 上传流程:
 * 1. 调用 b2_get_upload_url 获取临时上传地址 + token
 * 2. 在有效期内可重复使用
 * 3. 过期后重新获取
 */
async function getUploadUrl(): Promise<UploadUrl> {
  if (globalForB2.__b2UploadUrl) {
    return globalForB2.__b2UploadUrl
  }

  const auth = await getAuthToken()
  const bucketId = await getBucketId()

  const resp = await b2Request(
    `${auth.apiUrl}/b2api/v3/b2_get_upload_url`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucketId }),
      authToken: auth.authorizationToken,
    }
  )

  const data = await resp.json() as UploadUrl
  globalForB2.__b2UploadUrl = data
  return data
}

/**
 * 获取存储桶 ID（按名称查找），结果缓存到 globalThis
 */
async function getBucketId(): Promise<string> {
  const g = globalForB2
  if (g.__b2BucketId) return g.__b2BucketId

  const auth = await getAuthToken()

  const resp = await b2Request(
    `${auth.apiUrl}/b2api/v3/b2_list_buckets`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: auth.accountId }),
      authToken: auth.authorizationToken,
    }
  )

  const data = await resp.json() as { buckets: { bucketId: string; bucketName: string }[] }
  const bucketName = process.env.B2_BUCKET!
  const bucket = data.buckets.find((b) => b.bucketName === bucketName)
  if (!bucket) {
    const names = data.buckets.map((b) => `"${b.bucketName}"`).join(', ')
    throw new Error(`B2 存储桶 "${bucketName}" 不存在, 可用: [${names || '无'}]`)
  }
  g.__b2BucketId = bucket.bucketId
  return bucket.bucketId
}

/**
 * 清除授权缓存（认证失败时调用）
 */
function clearAuthCache(): void {
  globalForB2.__b2AuthToken = undefined
  globalForB2.__b2UploadUrl = undefined
}

/**
 * 标准化 B2 key 路径
 *
 * - 去除前导/尾随斜杠
 * - 空串代表根
 */
function normalizeKey(path: string): string {
  return path.replace(/^[\\/]+|[\\/]+$/g, '')
}

/**
 * B2 存储提供者实现
 */
export class B2Provider implements StorageProvider {
  readonly backend = 'backblaze' as const

  isConfigured(): boolean {
    return isB2Configured()
  }

  /**
   * 列出目录内容
   *
   * B2 使用前缀 + delimiter 实现虚拟目录列表：
   * - prefix: "pages/" 列出 pages/ 下所有文件
   * - delimiter: "/" 配合 prefix 可实现浅层列表
   *
   * 返回 FileStat 数组，与 webdav 客户端对齐。
   * 目录通过 key 中的 '/' 分隔符推断，用特殊 FileStat 表示。
   */
  async listDirectory(dirPath: string, _options?: ListDirectoryOptions): Promise<FileStat[]> {
    const auth = await getAuthToken()
    const prefix = normalizeKey(dirPath)
    const fullPrefix = prefix ? `${prefix}/` : ''

    const resp = await b2Request(
      `${auth.apiUrl}/b2api/v3/b2_list_file_names`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucketId: await getBucketId(),
          prefix: fullPrefix,
          delimiter: '/',
          maxFileCount: 10000,
        }),
        authToken: auth.authorizationToken,
      }
    )

    const data = await resp.json() as {
      files: B2FileInfo[]
    }

    const entries: FileStat[] = []

    // B2 使用 delimiter 时，目录项以 action='folder' 混在 files 数组中
    // fileName 格式: "pages/subdir/" — 以 '/' 结尾
    const seenFolders = new Set<string>()

    for (const file of data.files ?? []) {
      if (file.action === 'hide') continue

      // 目录项: fileName 以 '/' 结尾
      if (file.action === 'folder' || file.fileName.endsWith('/')) {
        // 提取目录名（去掉前缀和尾部 '/'）
        const dirName = file.fileName
          .replace(fullPrefix, '')
          .replace(/\/$/, '')
        if (!dirName || seenFolders.has(dirName)) continue
        seenFolders.add(dirName)

        entries.push({
          filename: dirName,
          basename: fullPrefix ? `${fullPrefix}${dirName}` : dirName,
          type: 'directory',
          size: 0,
          lastmod: new Date().toISOString(),
          mime: undefined,
          etag: null,
        })
        continue
      }

      // 普通文件
      const relativeName = fullPrefix ? file.fileName.slice(fullPrefix.length) : file.fileName
      if (!relativeName || relativeName.includes('/')) continue

      entries.push({
        filename: relativeName,
        basename: file.fileName,
        type: 'file',
        size: file.contentLength,
        lastmod: new Date(file.uploadTimestamp).toISOString(),
        mime: file.contentType || undefined,
        etag: null,
      })
    }

    return entries
  }

  /**
   * 获取文件内容
   *
   * 下载 URL 格式:
   * - CDN: {download_url}/file/{bucket_name}/{path}
   * - 直连: {apiUrl}/file/{bucket_name}/{path}
   *
   * 无论 CDN 还是直连模式，均发送 B2 Authorization header。
   * 与 rclone 行为一致：authorize 后的所有请求自动携带 token。
   * CDN 模式（如 Cloudflare Workers）同样依赖此 header 进行认证转发。
   *
   * 参考: https://www.backblaze.com/docs/cloud-storage-content-delivery-services
   */
  async getFileContents(
    filePath: string,
    options?: { signal?: AbortSignal }
  ): Promise<FileContent> {
    const bucketName = process.env.B2_BUCKET!
    const key = normalizeKey(filePath)

    if (!key) {
      throw new Error('B2: 不能读取根路径')
    }

    const downloadUrl = process.env.B2_DOWNLOAD_URL
    const auth = await getAuthToken()

    // 判断 CDN URL 是否指向本站自身
    // B2 的 CDN URL 格式为 {download_url}/file/{bucket}/{path}，
    // 若 download_url 指向与本站相同的域名，/file/ 路径不会匹配路由
    // 此时应使用 B2 API 直连
    const selfHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? ''
    const isSelfReferencing = !!(
      downloadUrl && selfHost &&
      (downloadUrl.includes(selfHost) || downloadUrl.includes('.vercel.app'))
    )

    const effectiveDownloadUrl = (downloadUrl && !isSelfReferencing)
      ? `${downloadUrl.replace(/\/+$/, '')}/file/${bucketName}/${encodeURIComponent(key).replace(/%2F/g, '/')}`
      : `${auth.apiUrl}/file/${bucketName}/${encodeURIComponent(key).replace(/%2F/g, '/')}`

    // B2_DOWNLOAD_URL 已设置且未自引用 → 走 CDN；否则走 B2 API 直连
    const mode = (downloadUrl && !isSelfReferencing) ? 'CDN' : '直连'
    const url = effectiveDownloadUrl

    console.warn(`[B2] getFileContents path="${key}" mode=${mode} url="${url}"`)
    const resp = await fetch(url, {
      headers: { Authorization: auth.authorizationToken },
      signal: options?.signal,
    })

    if (!resp.ok) {
      if (resp.status === 404) {
        throw Object.assign(new Error(`B2: 文件不存在: ${key}`), { status: 404 })
      }
      throw Object.assign(new Error(`B2: 下载失败 ${resp.status} ${key}`), { status: resp.status })
    }

    const body = Buffer.from(await resp.arrayBuffer())
    console.warn(`[B2] getFileContents path="${key}" mode=${mode} size=${body.length}`)
    return body
  }

  /**
   * 上传文件
   *
   * B2 上传流程:
   * 1. 获取上传 URL（带签名）
   * 2. POST 文件到上传 URL
   * 3. B2 返回文件 ID
   *
   * 如果上传失败（如 token 过期），清除缓存并重试一次。
   */
  async putFileContents(
    filePath: string,
    data: FileContent,
    options?: { headers?: Record<string, string> }
  ): Promise<void> {
    const key = normalizeKey(filePath)
    if (!key) {
      throw new Error('B2: 不能写入根路径')
    }

    const uploadData = await toBuffer(data)
    const contentType = options?.headers?.['Content-Type'] ?? guessContentType(key)
    const sha1 = createHash('sha1').update(uploadData).digest('hex')

    let uploadUrl: UploadUrl
    try {
      uploadUrl = await getUploadUrl()
    } catch (err) {
      // 获取上传 URL 失败可能是 token 过期
      clearAuthCache()
      throw err
    }

    try {
      const resp = await fetch(uploadUrl.uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: uploadUrl.authorizationToken,
          'X-Bz-File-Name': encodeURIComponent(key).replace(/%2F/g, '/'),
          'Content-Type': contentType,
          'Content-Length': String(uploadData.length),
          'X-Bz-Content-Sha1': sha1,
        },
        body: new Uint8Array(uploadData),
      })

      if (!resp.ok) {
        // 401 可能是 token 过期，清除缓存
        if (resp.status === 401) {
          clearAuthCache()
        }
        throw Object.assign(
          new Error(`B2: 上传失败 ${resp.status} ${key}`),
          { status: resp.status }
        )
      }
    } catch (err) {
      // 网络错误或 token 过期时，清除缓存
      if ((err as { status?: number })?.status === 401) {
        clearAuthCache()
      }
      throw err
    }
  }

  /**
   * 创建目录
   *
   * B2 没有原生目录概念。创建目录等同于上传一个空的目录占位文件:
   * {dirPath}/.keep（0 字节）
   *
   * recursive 模式下，逐级创建父目录。
   */
  async createDirectory(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
    const key = normalizeKey(dirPath)
    if (!key) return

    if (options?.recursive) {
      // 逐级创建
      const segments = key.split('/')
      let current = ''
      for (const seg of segments) {
        current = current ? `${current}/${seg}` : seg
        await this.ensureDirectory(current)
      }
    } else {
      await this.ensureDirectory(key)
    }
  }

  /**
   * 删除文件
   *
   * B2 需要先获取文件 ID，再调用 delete_file_version。
   */
  async deleteFile(filePath: string): Promise<void> {
    const auth = await getAuthToken()
    const bucketId = await getBucketId()
    const key = normalizeKey(filePath)

    if (!key) {
      throw new Error('B2: 不能删除根路径')
    }

    // 查找文件版本
    const listResp = await b2Request(
      `${auth.apiUrl}/b2api/v3/b2_list_file_versions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucketId,
          prefix: key,
          maxFileCount: 1,
        }),
        authToken: auth.authorizationToken,
      }
    )

    const data = await listResp.json() as { files: B2FileInfo[] }
    if (!data.files || data.files.length === 0) {
      throw Object.assign(new Error(`B2: 文件不存在: ${key}`), { status: 404 })
    }

    // 删除最新版本
    const file = data.files[0]!
    await b2Request(
      `${auth.apiUrl}/b2api/v3/b2_delete_file_version`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: file.fileId,
          fileName: file.fileName,
        }),
        authToken: auth.authorizationToken,
      }
    )
  }

  /**
   * 删除目录
   *
   * B2 没有原生目录概念。删除目录需要：
   * 1. 列出目录下所有文件（递归）
   * 2. 逐一删除
   * 3. 最后删除 .keep 占位文件（如存在）
   */
  async deleteDirectory(dirPath: string): Promise<void> {
    const key = normalizeKey(dirPath)
    if (!key) return

    const auth = await getAuthToken()
    const bucketId = await getBucketId()
    const dirPrefix = `${key}/`

    // 列出目录下所有文件（包括子目录中的文件）
    let startFileId: string | undefined
    do {
      const body: Record<string, unknown> = {
        bucketId,
        prefix: dirPrefix,
        maxFileCount: 1000,
      }
      if (startFileId) body.startFileId = startFileId

      const resp = await b2Request(
        `${auth.apiUrl}/b2api/v3/b2_list_file_versions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          authToken: auth.authorizationToken,
        }
      )

      const data = await resp.json() as { files: B2FileInfo[]; nextFileId?: string }
      for (const file of data.files ?? []) {
        if (file.action === 'hide') continue
        try {
          await b2Request(
            `${auth.apiUrl}/b2api/v3/b2_delete_file_version`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileId: file.fileId,
                fileName: file.fileName,
              }),
              authToken: auth.authorizationToken,
            }
          )
        } catch {
          // 单个文件删除失败不阻断整体删除
        }
      }

      startFileId = data.nextFileId
    } while (startFileId)

    // 删除 .keep 占位文件
    try {
      await this.deleteFile(`${key}/.keep`)
    } catch {
      // .keep 不存在是正常的，忽略
    }
  }

  /**
   * 移动/重命名文件或目录
   *
   * B2 没有原生 move 操作，实现为：读取源内容 → 写入目标 → 删除源。
   * 目录重命名：逐文件复制到新前缀下，再逐文件删除旧前缀。
   */
  async moveFile(fromPath: string, toPath: string): Promise<void> {
    const fromKey = normalizeKey(fromPath)
    const toKey = normalizeKey(toPath)
    if (!fromKey || !toKey) {
      throw new Error('B2: 不能移动根路径')
    }
    if (fromKey === toKey) return

    // 判断是单文件还是目录
    const isSingleFile = await this.isFile(fromKey)
    if (isSingleFile) {
      await this.moveSingleFile(fromKey, toKey)
      return
    }

    await this.moveDirectory(fromKey, toKey)
  }

  /**
   * 判断路径是否为单个文件（非目录）
   */
  private async isFile(key: string): Promise<boolean> {
    const auth = await getAuthToken()
    const bucketId = await getBucketId()
    const resp = await b2Request(
      `${auth.apiUrl}/b2api/v3/b2_list_file_names`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucketId, prefix: key, maxFileCount: 1 }),
        authToken: auth.authorizationToken,
      }
    )
    const data = await resp.json() as { files: B2FileInfo[] }
    return data.files.length > 0 &&
      data.files[0]!.fileName === key &&
      data.files[0]!.action === 'upload'
  }

  /**
   * 单文件重命名:下载 → 上传到新路径 → 删除旧路径
   */
  private async moveSingleFile(fromKey: string, toKey: string): Promise<void> {
    const content = await this.getFileContents(fromKey)
    const buf = toBufferSync(content)
    await this.putFileContents(toKey, buf)
    await this.deleteFile(fromKey)
  }

  /**
   * 目录重命名:逐文件复制 + 递归子目录 + 清理源
   */
  private async moveDirectory(fromKey: string, toKey: string): Promise<void> {
    const auth = await getAuthToken()
    const bucketId = await getBucketId()
    const fromPrefix = `${fromKey}/`

    // 列出源目录下的文件
    const listResp = await b2Request(
      `${auth.apiUrl}/b2api/v3/b2_list_file_names`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucketId,
          prefix: fromPrefix,
          delimiter: '/',
          maxFileCount: 10000,
        }),
        authToken: auth.authorizationToken,
      }
    )
    const listData = await listResp.json() as { files: B2FileInfo[] }
    const files = (listData.files ?? []).filter(
      (f) => f.action === 'upload' && !f.fileName.endsWith('/')
    )

    // 复制文件到新路径
    for (const file of files) {
      const relativeName = file.fileName.slice(fromPrefix.length)
      if (!relativeName || relativeName.includes('/')) continue
      const content = await this.getFileContents(file.fileName)
      const buf = toBufferSync(content)
      await this.putFileContents(`${toKey}/${relativeName}`, buf)
    }

    // 收集并递归处理子目录
    const subDirs = this.collectSubDirs(listData.files ?? [], fromPrefix)
    for (const subDir of subDirs) {
      await this.moveFile(`${fromKey}/${subDir}`, `${toKey}/${subDir}`)
    }

    // 清理源目录下的文件
    for (const file of files) {
      try { await this.deleteFile(file.fileName) } catch { /* 忽略 */ }
    }
    try { await this.deleteFile(`${fromKey}/.keep`) } catch { /* 忽略 */ }
  }

  /**
   * 从 B2 文件列表中提取子目录名称
   */
  private collectSubDirs(b2Files: B2FileInfo[], fromPrefix: string): string[] {
    const dirs = new Set<string>()
    for (const f of b2Files) {
      if (f.action === 'folder' || (f.fileName.endsWith('/') && f.fileName !== fromPrefix)) {
        const dirName = f.fileName.replace(fromPrefix, '').replace(/\/$/, '')
        if (dirName && !dirName.includes('/')) {
          dirs.add(dirName)
        }
      }
    }
    return [...dirs]
  }

  /**
   * 获取文件/目录元信息
   *
   * B2 使用 b2_get_file_info 获取文件信息。
   * 对于目录，返回一个合成的 FileStat。
   */
  async stat(path: string): Promise<FileStat> {
    const key = normalizeKey(path)

    if (!key) {
      // 根目录
      return {
        filename: '',
        basename: '',
        type: 'directory',
        size: 0,
        lastmod: new Date().toISOString(),
        mime: undefined,
        etag: null,
      }
    }

    // 先尝试作为文件获取
    try {
      const auth = await getAuthToken()

      // 尝试获取文件信息
      const resp = await b2Request(
        `${auth.apiUrl}/b2api/v3/b2_list_file_names`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bucketId: await getBucketId(),
            prefix: key,
            maxFileCount: 1,
          }),
          authToken: auth.authorizationToken,
        }
      )

      const data = await resp.json() as { files: B2FileInfo[] }
      if (data.files?.length > 0) {
        const file = data.files[0]
        if (file?.fileName === key && file.action !== 'hide') {
          return {
            filename: key.split('/').pop() ?? key,
            basename: key,
            type: 'file',
            size: file.contentLength,
            lastmod: new Date(file.uploadTimestamp).toISOString(),
            mime: file.contentType || undefined,
            etag: null,
          }
        }
      }

      // 检查是否是目录（是否有以 key/ 开头的文件）
      const dirResp = await b2Request(
        `${auth.apiUrl}/b2api/v3/b2_list_file_names`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bucketId: await getBucketId(),
            prefix: `${key}/`,
            maxFileCount: 1,
          }),
          authToken: auth.authorizationToken,
        }
      )

      const dirData = await dirResp.json() as { files: B2FileInfo[] }
      if (dirData.files && dirData.files.length > 0) {
        return {
          filename: key.split('/').pop() ?? key,
          basename: key,
          type: 'directory',
          size: 0,
          lastmod: new Date().toISOString(),
          mime: undefined,
          etag: null,
        }
      }

      // 不存在
      throw Object.assign(new Error(`B2: 路径不存在: ${key}`), { status: 404 })
    } catch (err) {
      if ((err as { status?: number })?.status === 404) {
        throw err
      }
      throw err
    }
  }

  /**
   * 确保目录存在（上传 .keep 占位文件）
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      // 先检查是否已有内容
      const auth = await getAuthToken()
      const resp = await b2Request(
        `${auth.apiUrl}/b2api/v3/b2_list_file_names`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bucketId: await getBucketId(),
            prefix: `${dirPath}/`,
            maxFileCount: 1,
          }),
          authToken: auth.authorizationToken,
        }
      )

      const data = await resp.json() as { files: B2FileInfo[]; folders: string[] }
      if (
        (data.files && data.files.length > 0) ||
        (data.folders && data.folders.length > 0)
      ) {
        return // 目录已有内容，无需创建
      }
    } catch {
      // 检查失败时继续尝试创建
    }

    // 上传 .keep 占位文件
    await this.putFileContents(`${dirPath}/.keep`, Buffer.alloc(0), {
      headers: { 'Content-Type': 'application/x-empty' },
    })
  }
}

/**
 * FileContent → Buffer 转换(异步)
 */
async function toBuffer(data: FileContent): Promise<Buffer> {
  if (Buffer.isBuffer(data)) return data
  if (typeof data === 'string') return Buffer.from(data, 'utf8')
  if (data instanceof ArrayBuffer) return Buffer.from(data)
  if (data && typeof data === 'object' && 'data' in data) {
    return toBuffer(data.data)
  }
  return Buffer.from(String(data))
}

/**
 * FileContent → Buffer 转换(同步,已知 FileContent 是同步返回值)
 */
function toBufferSync(data: FileContent): Buffer {
  if (Buffer.isBuffer(data)) return data
  if (typeof data === 'string') return Buffer.from(data, 'utf8')
  if (data instanceof ArrayBuffer) return Buffer.from(data)
  if (data && typeof data === 'object' && 'data' in data) {
    return toBufferSync(data.data)
  }
  return Buffer.from(String(data))
}

/**
 * 根据文件扩展名猜测 Content-Type
 */
function guessContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const types: Record<string, string> = {
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    ico: 'image/x-icon',
    pdf: 'application/pdf',
    txt: 'text/plain',
    md: 'text/markdown',
    xml: 'application/xml',
   woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
  }
  return types[ext ?? ''] ?? 'application/octet-stream'
}
