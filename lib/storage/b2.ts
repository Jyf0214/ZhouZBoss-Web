/**
 * Backblaze B2 存储提供者
 *
 * 基于 @aws-sdk/client-s3 实现，利用 B2 的 S3 兼容 API。
 *
 * 环境变量:
 * - B2_KEY_ID: B2 应用程序密钥 ID（作为 S3 accessKeyId）
 * - B2_APP_KEY: B2 应用程序密钥（作为 S3 secretAccessKey）
 * - B2_BUCKET: 存储桶名称
 * - B2_S3_ENDPOINT: (可选) S3 API 端点
 *   默认: https://s3.{region}.backblazeb2.com（region 从 B2 鉴权响应自动获取）
 * - B2_DOWNLOAD_URL: (可选) 自定义下载端点（如 Cloudflare CDN URL）
 *   格式: https://xxx.yyy.zzz（无尾斜杠）
 *   设置后，getFileContents 通过 SDK HTTP handler 透明走 CDN。
 *
 * 设计说明:
 * - B2 没有原生「目录」概念，用 key 前缀 + '/' 模拟
 * - S3 API 中目录不存在于 ListObjects，用 Delimiter='/' 让 S3 按前缀分组返回 CommonPrefixes
 * - B2 对 S3 DeleteObject 的支持：删除最新版本（非历史版本桶场景足够）
 */
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  paginateListObjectsV2,
  type S3ClientConfig,
} from '@aws-sdk/client-s3'
import type { FileStat } from 'webdav'
import type {
  StorageProvider,
  ListDirectoryOptions,
  FileContent,
} from './storage-provider'

/**
 * B2 鉴权结果（用于获取 region 和 S3 endpoint）
 */
interface B2AuthResult {
  accountId: string
  apiUrl: string
  downloadUrl: string
  s3ApiUrl: string  // S3 兼容 API 端点，从 storageApi.s3ApiUrl 获取
}

/**
 * B2 鉴权缓存（跨请求复用，与旧实现一致）
 */
const AUTH_TTL_MS = 20 * 60 * 60 * 1000 // 20 小时
const globalForB2 = globalThis as unknown as {
  __b2Auth?: B2AuthResult
  __b2AuthTime?: number
  __b2S3Client?: S3Client
  __b2S3Endpoint?: string
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
 * B2 原生鉴权（仅用于自动获取 S3 endpoint region）
 *
 * B2 鉴权响应的 apiUrl 形如 https://apiNNN.backblazeb2.com，
 * 其中 NNN 隐含 region 信息；S3 endpoint 格式为 https://s3.{region}.backblazeb2.com。
 * 若环境变量已配置 B2_S3_ENDPOINT，则跳过鉴权。
 */
async function b2Authorize(): Promise<B2AuthResult> {
  const cached = globalForB2.__b2Auth
  const cachedTime = globalForB2.__b2AuthTime ?? 0
  if (cached && (Date.now() - cachedTime) < AUTH_TTL_MS) return cached

  const keyId = process.env.B2_KEY_ID
  const appKey = process.env.B2_APP_KEY
  if (!keyId || !appKey) {
    throw new Error('B2 未配置: 请设置 B2_KEY_ID 和 B2_APP_KEY')
  }

  const credentials = Buffer.from(`${keyId}:${appKey}`).toString('base64')
  const resp = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
    headers: { Authorization: `Basic ${credentials}` },
  })

  if (!resp.ok) {
    throw new Error(`B2 鉴权失败 (HTTP ${resp.status})`)
  }

  const auth = parseAuthorizeResponse(await resp.json() as Record<string, unknown>)
  globalForB2.__b2Auth = auth
  globalForB2.__b2AuthTime = Date.now()
  return auth
}

/**
 * 解析 B2 鉴权响应，兼容 v3/v4 嵌套格式
 */
function parseAuthorizeResponse(data: Record<string, unknown>): B2AuthResult {
  const storageApi = (data.apiInfo as Record<string, unknown> | undefined)
    ?.storageApi as Record<string, unknown> | undefined
  const apiUrl = String(data.apiUrl ?? storageApi?.apiUrl ?? '')
  if (!apiUrl) {
    throw new Error(`B2 鉴权响应缺少 apiUrl, 字段: ${Object.keys(data).join(', ')}`)
  }
  // s3ApiUrl: B2 官方文档指定的 S3 兼容 API 端点
  // 格式: https://s3.<region>.backblazeb2.com
  const s3ApiUrl = String(storageApi?.s3ApiUrl ?? '')
  return {
    accountId: String(data.accountId ?? ''),
    apiUrl,
    downloadUrl: String(
      process.env.B2_DOWNLOAD_URL ?? data.downloadUrl ?? storageApi?.downloadUrl ?? ''
    ),
    s3ApiUrl,
  }
}

/**
 * 获取 B2 S3 兼容 API endpoint
 *
 * 优先级:
 * 1. 环境变量 B2_S3_ENDPOINT（手动覆盖）
 * 2. 鉴权响应 storageApi.s3ApiUrl（B2 官方推荐方式）
 * 3. 回退到 apiUrl（兼容旧版鉴权响应无 s3ApiUrl 的情况）
 */
function getS3Endpoint(auth: B2AuthResult): string {
  if (process.env.B2_S3_ENDPOINT) return process.env.B2_S3_ENDPOINT
  if (auth.s3ApiUrl) return auth.s3ApiUrl
  // 兼容旧版鉴权响应: apiUrl 可能也能作为 S3 endpoint
  return auth.apiUrl
}

/**
 * 获取或创建 S3Client 单例
 *
 * B2 的 S3 兼容 API 需要:
 * - forcePathStyle: true（B2 不支持虚拟主机式 bucket 访问）
 * - region: 任意有效值（B2 不检查 region，但 SDK 要求非空）
 */
async function getS3Client(): Promise<S3Client> {
  if (globalForB2.__b2S3Client) return globalForB2.__b2S3Client

  let effectiveEndpoint = process.env.B2_S3_ENDPOINT

  if (!effectiveEndpoint) {
    const auth = await b2Authorize()
    effectiveEndpoint = getS3Endpoint(auth)
  }

  const config: S3ClientConfig = {
    region: 'auto',
    endpoint: effectiveEndpoint,
    credentials: {
      accessKeyId: process.env.B2_KEY_ID!,
      secretAccessKey: process.env.B2_APP_KEY!,
    },
    forcePathStyle: true,
  }

  const client = new S3Client(config)
  globalForB2.__b2S3Client = client
  globalForB2.__b2S3Endpoint = effectiveEndpoint
  return client
}

/**
 * 标准化 B2 key 路径（去除前导/尾随斜杠，空串代表根）
 */
function normalizeKey(path: string): string {
  return path.replace(/^[\\/]+|[\\/]+$/g, '')
}

/**
 * 根据文件扩展名猜测 Content-Type
 */
function guessContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const types: Record<string, string> = {
    html: 'text/html', htm: 'text/html', css: 'text/css',
    js: 'application/javascript', json: 'application/json',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
    ico: 'image/x-icon', pdf: 'application/pdf', txt: 'text/plain',
    md: 'text/markdown', xml: 'application/xml',
    woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf',
  }
  return types[ext ?? ''] ?? 'application/octet-stream'
}

/**
 * FileContent → Buffer 转换
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
 * 向 entries 添加目录条目（去重）
 */
function addDirEntry(
  entries: FileStat[],
  seen: Set<string>,
  rawPrefix: string,
  fullPrefix: string
): void {
  const dirName = rawPrefix.replace(fullPrefix, '').replace(/\/$/, '')
  if (!dirName || seen.has(dirName)) return
  seen.add(dirName)
  entries.push({
    filename: dirName,
    basename: fullPrefix ? `${fullPrefix}${dirName}` : dirName,
    type: 'directory',
    size: 0,
    lastmod: new Date().toISOString(),
    mime: undefined,
    etag: null,
  })
}

interface ContentEntryCtx {
  entries: FileStat[]
  seen: Set<string>
  fullPrefix: string
}

/**
 * 处理 S3 Contents 条目（文件或 B2 虚拟目录标记）
 */
function processContentEntry(
  ctx: ContentEntryCtx,
  key: string,
  size: number,
  lastModified: Date | undefined,
  etag: string | null | undefined
): void {
  const { entries, seen, fullPrefix } = ctx
  if (!key || key === fullPrefix) return

  // B2 虚拟目录标记: 以 '/' 结尾
  if (key.endsWith('/')) {
    const dirName = key.replace(fullPrefix, '').replace(/\/$/, '')
    if (dirName && !seen.has(dirName)) {
      seen.add(dirName)
      entries.push({
        filename: dirName,
        basename: fullPrefix ? `${fullPrefix}${dirName}` : dirName,
        type: 'directory',
        size: 0,
        lastmod: new Date().toISOString(),
        mime: undefined,
        etag: null,
      })
    }
    return
  }

  // 普通文件
  const relativeName = fullPrefix ? key.slice(fullPrefix.length) : key
  if (!relativeName) return
  // 根目录列表时 key 可能含 '/'（如 pages/file.html），只提取第一段
  const displayName = fullPrefix ? relativeName : relativeName.split('/')[0]!
  if (!displayName || seen.has(displayName)) return
  seen.add(displayName)

  entries.push({
    filename: displayName,
    basename: key,
    type: 'file',
    size,
    lastmod: lastModified?.toISOString() ?? new Date().toISOString(),
    mime: undefined,
    etag: etag ?? null,
  })
}

/**
 * B2 存储提供者（基于 @aws-sdk/client-s3）
 */
export class B2Provider implements StorageProvider {
  readonly backend = 'backblaze' as const

  isConfigured(): boolean {
    return isB2Configured()
  }

  /**
   * 列出目录内容
   *
   * 使用 S3 ListObjectsV2 + Delimiter='/' 实现浅层列表：
   * - CommonPrefixes → 子目录
   * - Contents → 当前层文件（过滤 key 以 '/' 结尾的虚拟目录条目）
   */
  async listDirectory(dirPath: string, _options?: ListDirectoryOptions): Promise<FileStat[]> {
    const client = await getS3Client()
    const prefix = normalizeKey(dirPath)
    const fullPrefix = prefix ? `${prefix}/` : ''

    const entries: FileStat[] = []
    const seenNames = new Set<string>()
    const ctx: ContentEntryCtx = { entries, seen: seenNames, fullPrefix }
    let continuationToken: string | undefined

    do {
      const resp = await client.send(new ListObjectsV2Command({
        Bucket: process.env.B2_BUCKET!,
        Prefix: fullPrefix,
        Delimiter: '/',
        MaxKeys: 1000,
        ...(continuationToken ? { ContinuationToken: continuationToken } : {}),
      }))

      for (const cp of resp.CommonPrefixes ?? []) {
        addDirEntry(entries, seenNames, cp.Prefix ?? '', fullPrefix)
      }

      for (const obj of resp.Contents ?? []) {
        processContentEntry(ctx, obj.Key ?? '', obj.Size ?? 0, obj.LastModified, obj.ETag)
      }

      continuationToken = resp.NextContinuationToken
    } while (continuationToken)

    return entries
  }

  /**
   * 获取文件内容
   *
   * CDN 模式: 通过自定义 HTTP handler 将请求透明转发到 CDN 端点，
   * S3 SDK 自动处理签名（Authorization header 会传递到 CDN）。
   */
  async getFileContents(
    filePath: string,
    options?: { signal?: AbortSignal }
  ): Promise<FileContent> {
    const key = normalizeKey(filePath)
    if (!key) {
      throw new Error('B2: 不能读取根路径')
    }

    const client = await getS3Client()
    const downloadUrl = process.env.B2_DOWNLOAD_URL

    // 判断 CDN URL 是否指向本站自身
    const selfHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? ''
    const isSelfReferencing = !!(
      downloadUrl && selfHost &&
      (downloadUrl.includes(selfHost) || downloadUrl.includes('.vercel.app'))
    )

    const useCdn = !!(downloadUrl && !isSelfReferencing)

    const cmd = new GetObjectCommand({
      Bucket: process.env.B2_BUCKET!,
      Key: key,
    })

    const options_: Record<string, unknown> = {}
    if (options?.signal) options_.signal = options.signal

    // CDN 模式: 自定义 HTTP handler，将请求转发到 CDN 端点
    if (useCdn) {
      const cdnBase = (downloadUrl ?? '').replace(/\/+$/, '')
      const bucketName = process.env.B2_BUCKET!
      options_.requestHandler = {
        async handle(request: { output: Record<string, unknown>; httpRequest: { hostname: string; path: string; headers: Record<string, string>; method: string; protocol: string; port?: number } }) {
          const cdnUrl = `${cdnBase}/file/${bucketName}/${key}`
          console.warn(`[B2] getFileContents path="${key}" mode=CDN url="${cdnUrl}"`)

          // 安全:剥离 Authorization 头,避免 B2 凭据泄露给第三方 CDN
          const { Authorization: _auth, ...safeHeaders } = request.httpRequest.headers
          const resp = await fetch(cdnUrl, {
            headers: safeHeaders,
            signal: options?.signal,
          })

          if (!resp.ok) {
            const err = new Error(`CDN 下载失败 ${resp.status}`) as Error & { $metadata?: { httpStatusCode?: number }; name: string }
            err.name = resp.status === 404 ? 'NoSuchKey' : 'HttpError'
            err.$metadata = { httpStatusCode: resp.status }
            throw err
          }

          const arrayBuffer = await resp.arrayBuffer()
          return {
            response: {
              body: Buffer.from(arrayBuffer),
              statusCode: resp.status,
              headers: Object.fromEntries(resp.headers.entries()),
            },
          }
        },
        async destroy() { /* S3 SDK 要求此方法，无需清理 */ },
      }
    } else {
      console.warn(`[B2] getFileContents path="${key}" mode=直连`)
    }

    const resp = await client.send(cmd, options_)
    if (!resp.Body) {
      throw new Error(`B2: 文件内容为空: ${key}`)
    }
    const body = await resp.Body.transformToByteArray()
    const buffer = Buffer.from(body)
    console.warn(`[B2] getFileContents path="${key}" mode=${useCdn ? 'CDN' : '直连'} size=${buffer.length}`)
    return buffer
  }

  /**
   * 上传/覆盖文件
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

    const buf = await toBuffer(data)
    const contentType = options?.headers?.['Content-Type'] ?? guessContentType(key)

    const client = await getS3Client()
    await client.send(new PutObjectCommand({
      Bucket: process.env.B2_BUCKET!,
      Key: key,
      Body: buf,
      ContentType: contentType,
      ContentLength: buf.length,
    }))
  }

  /**
   * 创建目录（B2 无原生目录，上传 .keep 占位文件）
   */
  async createDirectory(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
    const key = normalizeKey(dirPath)
    if (!key) return

    if (options?.recursive) {
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
   */
  async deleteFile(filePath: string): Promise<void> {
    const key = normalizeKey(filePath)
    if (!key) {
      throw new Error('B2: 不能删除根路径')
    }

    const client = await getS3Client()
    await client.send(new DeleteObjectCommand({
      Bucket: process.env.B2_BUCKET!,
      Key: key,
    }))
  }

  /**
   * 删除目录（递归删除所有对象 + .keep 占位文件）
   */
  async deleteDirectory(dirPath: string): Promise<void> {
    const key = normalizeKey(dirPath)
    if (!key) return

    const client = await getS3Client()
    const bucket = process.env.B2_BUCKET!
    const dirPrefix = `${key}/`

    // 递归列出并删除目录下所有对象
    const paginator = paginateListObjectsV2(
      { client },
      { Bucket: bucket, Prefix: dirPrefix }
    )

    const keysToDelete: string[] = []
    for await (const page of paginator) {
      for (const obj of page.Contents ?? []) {
        if (obj.Key) keysToDelete.push(obj.Key)
      }
    }

    // 批量删除（S3 DeleteObjects 支持最多 1000 个 key）
    for (let i = 0; i < keysToDelete.length; i += 1000) {
      const batch = keysToDelete.slice(i, i + 1000)
      await Promise.all(
        batch.map((k) =>
          client.send(new DeleteObjectCommand({ Bucket: bucket, Key: k }))
        )
      )
    }

    // 删除 .keep 占位文件
    try {
      await this.deleteFile(`${key}/.keep`)
    } catch {
      // .keep 不存在是正常的
    }
  }

  /**
   * 移动/重命名文件或目录
   *
   * S3 无原生 move，实现为 CopyObject + DeleteObject。
   * 目录移动: 递归复制所有子对象到新前缀，再递归删除旧前缀。
   */
  async moveFile(fromPath: string, toPath: string): Promise<void> {
    const fromKey = normalizeKey(fromPath)
    const toKey = normalizeKey(toPath)
    if (!fromKey || !toKey) {
      throw new Error('B2: 不能移动根路径')
    }
    if (fromKey === toKey) return

    const isSingleFile = await this.isFile(fromKey)
    if (isSingleFile) {
      await this.moveSingleFile(fromKey, toKey)
    } else {
      await this.moveDirectory(fromKey, toKey)
    }
  }

  /**
   * 判断路径是否为单文件（非目录）
   */
  private async isFile(key: string): Promise<boolean> {
    const client = await getS3Client()
    try {
      const resp = await client.send(new HeadObjectCommand({
        Bucket: process.env.B2_BUCKET!,
        Key: key,
      }))
      return !!resp.ContentLength && resp.ContentLength > 0 ||
        (resp.Metadata && Object.keys(resp.Metadata).length > 0) ||
        resp.ContentType !== undefined
    } catch {
      // HeadObject 失败 → 可能是目录或不存在
      // 尝试列出前缀下的内容
      const listResp = await client.send(new ListObjectsV2Command({
        Bucket: process.env.B2_BUCKET!,
        Prefix: `${key}/`,
        MaxKeys: 1,
      }))
      return !(listResp.KeyCount && listResp.KeyCount > 0)
    }
  }

  /**
   * 单文件移动: copy → delete
   */
  private async moveSingleFile(fromKey: string, toKey: string): Promise<void> {
    const client = await getS3Client()
    const bucket = process.env.B2_BUCKET!

    await client.send(new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${fromKey}`,
      Key: toKey,
    }))

    await client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: fromKey,
    }))
  }

  /**
   * 目录移动: 递归复制 + 递归删除
   */
  private async moveDirectory(fromKey: string, toKey: string): Promise<void> {
    const client = await getS3Client()
    const bucket = process.env.B2_BUCKET!
    const fromPrefix = `${fromKey}/`

    // 递归列出源目录所有对象
    const paginator = paginateListObjectsV2(
      { client },
      { Bucket: bucket, Prefix: fromPrefix }
    )

    const objectsToCopy: string[] = []
    for await (const page of paginator) {
      for (const obj of page.Contents ?? []) {
        if (obj.Key) objectsToCopy.push(obj.Key)
      }
    }

    // 逐个复制到新前缀
    for (const srcKey of objectsToCopy) {
      const relativeName = srcKey.slice(fromPrefix.length)
      if (!relativeName) continue
      const destKey = `${toKey}/${relativeName}`

      await client.send(new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${srcKey}`,
        Key: destKey,
      }))
    }

    // 递归删除源目录
    await this.deleteDirectory(fromKey)
  }

  /**
   * 获取文件/目录元信息
   */
  async stat(path: string): Promise<FileStat> {
    const key = normalizeKey(path)

    if (!key) {
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

    const client = await getS3Client()
    const bucket = process.env.B2_BUCKET!

    // 尝试作为文件获取
    try {
      const resp = await client.send(new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      }))
      return {
        filename: key.split('/').pop() ?? key,
        basename: key,
        type: 'file',
        size: resp.ContentLength ?? 0,
        lastmod: resp.LastModified?.toISOString() ?? new Date().toISOString(),
        mime: resp.ContentType ?? undefined,
        etag: resp.ETag ?? null,
      }
    } catch {
      // HeadObject 失败 → 可能是目录或不存在
    }

    // 尝试作为目录（前缀下有内容）
    try {
      const resp = await client.send(new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: `${key}/`,
        MaxKeys: 1,
      }))
      if (resp.KeyCount && resp.KeyCount > 0) {
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
    } catch {
      // 忽略
    }

    throw Object.assign(new Error(`B2: 路径不存在: ${key}`), { status: 404 })
  }

  /**
   * 确保目录存在（检查是否有内容，无则上传 .keep 占位文件）
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      const client = await getS3Client()
      const resp = await client.send(new ListObjectsV2Command({
        Bucket: process.env.B2_BUCKET!,
        Prefix: `${dirPath}/`,
        MaxKeys: 1,
      }))
      if (resp.KeyCount && resp.KeyCount > 0) return
    } catch {
      // 检查失败时继续尝试创建
    }

    await this.putFileContents(`${dirPath}/.keep`, Buffer.alloc(0), {
      headers: { 'Content-Type': 'application/x-empty' },
    })
  }
}
