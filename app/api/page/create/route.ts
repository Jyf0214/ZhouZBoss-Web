/**
 * 自定义页面快捷创建 API
 * POST /api/page/create
 *
 * 写入策略:
 * 1. WebDAV — 创建目录 + 写入 HTML 文件（唯一数据源）
 * 2. 数据库 — StorageFolder 元数据记录
 *
 * 本地 ./pages/ 目录由构建时 sync-pages.mjs 从 WebDAV 同步，运行时不应写入。
 *
 * 认证: 仅限超级管理员(requireSudo)
 */
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getDb } from '@/lib/db'
import { isWebDavConfigured, getWebDavClient } from '@/lib/webdav'
import { renderTemplate, type TemplateType } from '@/lib/page-templates'

/** 名称白名单:字母、数字、中文、连字符、下划线，1-100 字符 */
const NAME_REGEX = /^[a-zA-Z0-9\u4e00-\u9fff_-]{1,100}$/

/** 请求体类型 */
interface CreatePageBody {
  name: string
  template: TemplateType
  isPublic: boolean
}

/* ── 辅助函数 ── */

/** 校验请求参数 */
function validateParams(body: CreatePageBody): NextResponse | null {
  const { name, template } = body
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: '名称不能为空' }, { status: 400 })
  }
  if (!NAME_REGEX.test(name)) {
    return NextResponse.json(
      { error: '名称只能包含字母、数字、中文、连字符和下划线' },
      { status: 400 },
    )
  }
  if (name.includes('.') || name.includes('/') || name.includes('\\')) {
    return NextResponse.json({ error: '名称包含非法字符' }, { status: 400 })
  }
  if (!template || typeof template !== 'string') {
    return NextResponse.json({ error: '模板类型不能为空' }, { status: 400 })
  }
  return null
}

/** 检查 WebDAV 和数据库是否已有同名页面 */
async function checkDuplicates(name: string): Promise<NextResponse | null> {
  const prisma = getDb().prisma
  if (!prisma) return null
  try {
    const existing = await prisma.storageFolder.findUnique({
      where: { path: `pages/${name}` },
    })
    if (existing) {
      return NextResponse.json(
        { error: `页面 "${name}" 已存在` },
        { status: 409 },
      )
    }
  } catch (err) {
    console.error('[page.create] 数据库查询失败:', err)
  }
  return null
}

/** 写入 WebDAV（唯一数据源） */
async function writeToWebDav(name: string, htmlContent: string): Promise<NextResponse | null> {
  const webdavDir = `pages/${name}`
  const webdavFile = `${webdavDir}/index.html`
  try {
    const client = getWebDavClient()
    await client.createDirectory(webdavDir, { recursive: true })
    const writeStream = client.createWriteStream(webdavFile, { overwrite: true })
    await pipeline(Readable.from([Buffer.from(htmlContent, 'utf-8')]), writeStream)
    return null
  } catch (err) {
    return NextResponse.json(
      { error: `WebDAV 写入失败: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    )
  }
}

/** 写入数据库记录（失败不阻断） */
async function writeToDb(name: string, isPublic: boolean): Promise<void> {
  const prisma = getDb().prisma
  if (!prisma) return
  try {
    await prisma.storageFolder.upsert({
      where: { path: `pages/${name}` },
      create: { path: `pages/${name}`, public: isPublic, description: null },
      update: { public: isPublic, updatedAt: new Date() },
    })
  } catch (err) {
    console.warn('[page.create] 数据库写入失败（页面已写入 WebDAV）:', err)
  }
}

/* ── 主 Handler ── */

export const POST = apiHandler('POST', { label: 'page.create', requireSudo: true }, async (req) => {
  let body: CreatePageBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 })
  }

  const validateError = validateParams(body)
  if (validateError) return validateError

  if (!isWebDavConfigured()) {
    return NextResponse.json(
      { error: 'WebDAV 未配置，无法创建页面', code: 'NOT_CONFIGURED' },
      { status: 503 },
    )
  }

  const duplicateError = await checkDuplicates(body.name)
  if (duplicateError) return duplicateError

  let htmlContent: string
  try {
    htmlContent = renderTemplate(body.template, { title: body.name })
  } catch (err) {
    return NextResponse.json(
      { error: `模板渲染失败: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    )
  }

  const webdavError = await writeToWebDav(body.name, htmlContent)
  if (webdavError) return webdavError

  await writeToDb(body.name, body.isPublic)

  return NextResponse.json({
    ok: true,
    path: `/page/${body.name}/index.html`,
    name: body.name,
    template: body.template,
    isPublic: body.isPublic,
  })
})
