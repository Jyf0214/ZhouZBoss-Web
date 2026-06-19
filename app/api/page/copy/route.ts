/**
 * 自定义页面复制 API
 * POST /api/page/copy
 *
 * 将已有页面的内容（HTML + meta.json）复制为新页面。
 *
 * 写入策略:
 * 1. WebDAV — 从源路径读取，写入新路径（唯一数据源）
 *
 * 本地 ./pages/ 目录由构建时 sync-pages.mjs 从 WebDAV 同步，运行时不应写入。
 *
 * 认证: 仅限超级管理员(requireSudo)
 */
import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { isStorageConfigured, getStorageProvider } from '@/lib/storage/storage-provider'
import { normalizeWebDavContent } from '@/lib/page-source/shared'

/** 名称白名单:字母、数字、中文、连字符、下划线，1-100 字符 */
const NAME_REGEX = /^[a-zA-Z0-9\u4e00-\u9fff_-]{1,100}$/

/** 请求体类型 */
interface CopyPageBody {
  /** 源页面的文件夹路径（相对于 pages/），如 "my-page" 或 "subdir/my-page" */
  sourcePath: string
  /** 新页面名称 */
  newName: string
}

/* ── 辅助函数 ── */

/** 校验请求参数 */
function validateParams(body: CopyPageBody): NextResponse | null {
  if (!body.sourcePath || typeof body.sourcePath !== 'string') {
    return NextResponse.json({ error: '源页面路径不能为空' }, { status: 400 })
  }
  if (!body.newName || typeof body.newName !== 'string') {
    return NextResponse.json({ error: '新页面名称不能为空' }, { status: 400 })
  }
  if (!NAME_REGEX.test(body.newName)) {
    return NextResponse.json(
      { error: '名称只能包含字母、数字、中文、连字符和下划线' },
      { status: 400 },
    )
  }
  if (body.newName.includes('.') || body.newName.includes('/') || body.newName.includes('\\')) {
    return NextResponse.json({ error: '名称包含非法字符' }, { status: 400 })
  }
  if (body.sourcePath === body.newName) {
    return NextResponse.json({ error: '新页面名称不能与源页面相同' }, { status: 400 })
  }
  return null
}

/* ── 主 Handler ── */

export const POST = apiHandler('POST', { label: 'page.copy', requireSudo: true }, async (req) => {
  let body: CopyPageBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 })
  }

  const validateError = validateParams(body)
  if (validateError) return validateError

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: '存储后端未配置，无法复制页面', code: 'NOT_CONFIGURED' },
      { status: 503 },
    )
  }

  const provider = await getStorageProvider()

  /* 1. 读取源页面 HTML */
  const sourceHtmlPath = `pages/${body.sourcePath}/index.html`
  let sourceHtml: string
  try {
    const raw = await provider.getFileContents(sourceHtmlPath)
    if (raw === null || raw === undefined) {
      return NextResponse.json(
        { error: `源页面 "${body.sourcePath}" 不存在` },
        { status: 404 },
      )
    }
    sourceHtml = normalizeWebDavContent(raw)
    if (!sourceHtml) {
      return NextResponse.json(
        { error: '源页面内容为空' },
        { status: 400 },
      )
    }
  } catch (err) {
    console.error('[page.copy] 读取源页面失败:', err)
    return NextResponse.json(
      { error: '读取源页面失败' },
      { status: 500 },
    )
  }

  /* 2. 检查目标是否已存在 */
  const targetDir = `pages/${body.newName}`
  const targetHtmlPath = `${targetDir}/index.html`
  try {
    await provider.stat(targetHtmlPath)
    return NextResponse.json(
      { error: `目标页面 "${body.newName}" 已存在` },
      { status: 409 },
    )
  } catch {
    /* stat 失败说明不存在，可以继续 */
  }

  /* 3. 创建目标目录并写入 HTML */
  try {
    await provider.createDirectory(targetDir, { recursive: true })
    await provider.putFileContents(targetHtmlPath, Buffer.from(sourceHtml, 'utf-8'), { headers: { overwrite: 'true' } })
  } catch (err) {
    console.error('[page.copy] 写入目标页面失败:', err)
    return NextResponse.json(
      { error: '写入目标页面失败' },
      { status: 500 },
    )
  }

  /* 4. 尝试复制 meta.json（失败不阻断） */
  const sourceMetaPath = `pages/${body.sourcePath}/meta.json`
  const targetMetaPath = `${targetDir}/meta.json`
  try {
    const rawMeta = await provider.getFileContents(sourceMetaPath)
    if (rawMeta !== null && rawMeta !== undefined) {
      const metaText = normalizeWebDavContent(rawMeta)
      if (metaText) {
        const meta = JSON.parse(metaText)
        // 重置时间为当前时间
        meta.createdAt = new Date().toISOString()
        meta.updatedAt = new Date().toISOString()
        await provider.putFileContents(targetMetaPath, Buffer.from(JSON.stringify(meta, null, 2), 'utf-8'), { headers: { overwrite: 'true' } })
      }
    }
  } catch {
    /* meta.json 复制失败不阻断主流程 */
  }

  return NextResponse.json({
    ok: true,
    sourcePath: body.sourcePath,
    name: body.newName,
    path: `/page/${body.newName}/index.html`,
  })
})
