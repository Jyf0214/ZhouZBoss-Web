/**
 * 上传文件到存储池
 * POST /api/storage/upload/[...path]
 * 请求体:原始二进制流(请求体即文件内容)
 * 大小上限 50MB;超限返回 413
 *
 * 流式读取请求体,通过 TransformStream 实时累计字节数,超限时立即终止;
 * 完整数据收集后通过 StorageProvider.putFileContents() 写入。
 */
import { NextResponse } from 'next/server'
import { getSessionWithKeyId, requireApiKeyPermission } from '@/lib/auth'
import {
  MAX_UPLOAD_SIZE,
  buildWebDavTarget,
  catchAllHandler,
  getPathParts,
  getStorageProvider,
  invalidPathResponse,
  isValidStoragePath,
  isStorageConfigured,
  payloadTooLargeResponse,
  resolveStoragePath,
  storageErrorResponse,
  storageNotConfigured,
} from '../../_helpers'

/** 被禁止的文件扩展名（可执行、可注入脚本、或其他高风险类型） */
const BLOCKED_EXTENSIONS = new Set([
  '.svg', '.svgz',
  '.php', '.php3', '.php4', '.php5', '.phtml',
  '.exe', '.msi', '.bat', '.cmd', '.com', '.pif',
  '.sh', '.bash', '.zsh', '.csh', '.ksh',
  '.ps1', '.psm1', '.psd1',
  '.vbs', '.vbe', '.wsf', '.wsh',
  '.scr', '.jar', '.class',
])

/** 从路径中提取文件扩展名（小写），无扩展名返回空字符串 */
function getExtension(filePath: string): string {
  const lastSeg = filePath.split('/').pop() ?? ''
  const dotIdx = lastSeg.lastIndexOf('.')
  if (dotIdx <= 0) return ''
  return lastSeg.slice(dotIdx).toLowerCase()
}

/** 校验上传文件扩展名是否安全，被阻止时返回 400 响应，否则返回 null */
function validateUploadExtension(relPath: string): NextResponse | null {
  const ext = getExtension(relPath)
  if (ext !== '' && BLOCKED_EXTENSIONS.has(ext)) {
    console.warn(`[storage.upload] 拒绝上传: 扩展名 "${ext}" 在黑名单中 path="${relPath}"`)
    return NextResponse.json(
      { error: '不支持的文件类型', blocked: ext },
      { status: 400 },
    )
  }
  return null
}

/** 快速拒绝 Content-Length 超限请求 */
function rejectIfOversized(contentLengthHeader: string | null): NextResponse | null {
  if (contentLengthHeader === null) return null
  const declared = Number(contentLengthHeader)
  if (Number.isFinite(declared) && declared > MAX_UPLOAD_SIZE) {
    return payloadTooLargeResponse(declared)
  }
  return null
}

/** 流式读取请求体为 Buffer，带实时大小限制 */
async function readBodyWithSizeLimit(
  body: ReadableStream<Uint8Array>,
  target: string,
): Promise<{ buffer: Buffer; bytesReceived: number } | NextResponse> {
  let bytesReceived = 0
  let sizeExceeded = false
  const sizeGuard = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      bytesReceived += chunk.byteLength
      if (bytesReceived > MAX_UPLOAD_SIZE) {
        sizeExceeded = true
        controller.error(new Error('payload-too-large'))
        return
      }
      controller.enqueue(chunk)
    },
  })
  const guarded = body.pipeThrough(sizeGuard)

  try {
    const reader = guarded.getReader()
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    return { buffer: Buffer.concat(chunks), bytesReceived }
  } catch (err) {
    if (sizeExceeded) {
      console.warn(`[storage.upload] target="${target}" 超限 size=${bytesReceived} bytes`)
      return payloadTooLargeResponse(bytesReceived)
    }
    console.error(`[storage.upload] target="${target}" 读取失败`, err)
    return storageErrorResponse(err, '上传文件')
  }
}

export const POST = catchAllHandler<{ path: string[] }>(
  'POST',
  { label: 'storage.upload', requireAdmin: true },
  async (req, context) => {
    if (!isStorageConfigured()) return storageNotConfigured()

    // API 密钥细粒度权限检查
    const authResult = await getSessionWithKeyId()
    if (authResult) {
      const permErr = await requireApiKeyPermission(authResult.session, authResult.currentKeyId, 'storage_write')
      if (permErr) return permErr
    }

    const parts = await getPathParts(context)
    const rel = resolveStoragePath(parts)
    if (!isValidStoragePath(rel) || rel === '') return invalidPathResponse()

    const blocked = validateUploadExtension(rel)
    if (blocked) return blocked

    const target = buildWebDavTarget(parts)

    const rejected = rejectIfOversized(req.headers.get('content-length'))
    if (rejected) return rejected

    if (!req.body) {
      return NextResponse.json({ error: '请求体为空' }, { status: 400 })
    }

    const result = await readBodyWithSizeLimit(req.body, target)
    if (result instanceof NextResponse) return result
    const { buffer, bytesReceived } = result

    try {
      const provider = await getStorageProvider()
      await provider.putFileContents(target, buffer, { headers: { overwrite: 'true' } })
    } catch (err) {
      console.error(`[storage.upload] target="${target}" 写入失败`, err)
      return storageErrorResponse(err, '上传文件')
    }

    console.warn(`[storage.upload] target="${target}" size=${bytesReceived} bytes`)
    return NextResponse.json({
      path: target,
      size: bytesReceived,
      uploadedAt: new Date().toISOString(),
    })
  }
)
