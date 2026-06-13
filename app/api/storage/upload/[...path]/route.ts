/**
 * 上传文件到存储池
 * POST /api/storage/upload/[...path]
 * 请求体:原始二进制流(请求体即文件内容)
 * 大小上限 50MB;超限返回 413
 *
 * 流式上传:不再把整个文件读到 V8 堆,而是直接把请求体流过 WebDAV 写入流,
 * 通过 TransformStream 实时累计字节数,超限时立即终止并清理已写入的部分文件。
 */
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'
import { NextResponse } from 'next/server'
import {
  MAX_UPLOAD_SIZE,
  buildWebDavTarget,
  catchAllHandler,
  getPathParts,
  getWebDavClient,
  invalidPathResponse,
  isValidStoragePath,
  isWebDavConfigured,
  payloadTooLargeResponse,
  resolveStoragePath,
  webdavErrorResponse,
  webdavNotConfigured,
} from '../../_helpers'

export const POST = catchAllHandler<{ path: string[] }>(
  'POST',
  { label: 'storage.upload', requireAdmin: true },
  async (req, context) => {
    if (!isWebDavConfigured()) return webdavNotConfigured()

    const parts = await getPathParts(context)
    const rel = resolveStoragePath(parts)
    if (!isValidStoragePath(rel) || rel === '') return invalidPathResponse()
    const target = buildWebDavTarget(parts)

    // Content-Length 快速拒绝(避免对超大请求也分配流处理管线)
    const contentLengthHeader = req.headers.get('content-length')
    if (contentLengthHeader !== null) {
      const declared = Number(contentLengthHeader)
      if (Number.isFinite(declared) && declared > MAX_UPLOAD_SIZE) {
        return payloadTooLargeResponse(declared)
      }
    }

    if (!req.body) {
      return NextResponse.json({ error: '请求体为空' }, { status: 400 })
    }

    let client
    try {
      client = getWebDavClient()
    } catch (err) {
      return webdavErrorResponse(err, '上传文件')
    }

    // 实时累计字节数,超限时立即终止流并通过管道错误信号上报
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
    const guarded = req.body.pipeThrough(sizeGuard) as unknown as NodeReadableStream

    const writeStream = client.createWriteStream(target, { overwrite: true })
    try {
      await pipeline(Readable.fromWeb(guarded), writeStream)
    } catch (err) {
      // 清理已写入的部分文件(尽力而为,不抛错)
      try {
        await client.deleteFile(target)
      } catch {
        // ignore: 文件可能尚未创建,或远端已无该记录
      }
      if (sizeExceeded) {
        console.warn(`[storage.upload] target="${target}" 超限 size=${bytesReceived} bytes`)
        return payloadTooLargeResponse(bytesReceived)
      }
      console.error(`[storage.upload] target="${target}" 写入失败`, err)
      return webdavErrorResponse(err, '上传文件')
    }

    console.warn(`[storage.upload] target="${target}" size=${bytesReceived} bytes`)
    return NextResponse.json({
      path: target,
      size: bytesReceived,
      uploadedAt: new Date().toISOString(),
    })
  }
)
