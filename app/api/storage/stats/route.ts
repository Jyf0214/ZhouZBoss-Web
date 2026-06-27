/**
 * 存储空间分析 API
 * GET /api/storage/stats
 *
 * 递归扫描存储池，统计:
 * - 总文件数、总大小
 * - 按文件夹分组的大小统计（Top 10）
 * - 按文件类型分组的大小统计（图片/文档/视频/其它）
 * - 最大文件 Top 10（文件名、大小、路径）
 *
 * 结果缓存 5 分钟（模块级变量 + 时间戳）
 */
import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getStorageProvider, isStorageConfigured } from '@/lib/storage/storage-provider'
import { storageNotConfigured } from '../_helpers'

/* ---------- 类型定义 ---------- */

/** 单个文件统计项 */
interface FileItem {
  /** 文件名 */
  name: string
  /** 完整相对路径 */
  path: string
  /** 文件大小（字节） */
  size: number
  /** MIME 类型（可能为 null） */
  mimeType: string | null
}

/** 文件夹大小统计项 */
interface FolderStat {
  /** 文件夹路径（顶层文件夹名） */
  path: string
  /** 文件夹下文件总大小（字节） */
  size: number
  /** 文件夹下文件数量 */
  count: number
}

/** 文件类型统计项 */
interface TypeStat {
  /** 类型分组名 */
  category: string
  /** 该类型文件总大小（字节） */
  size: number
  /** 该类型文件数量 */
  count: number
}

/** API 返回结果 */
interface StorageStatsResult {
  /** 总文件数 */
  totalFiles: number
  /** 总大小（字节） */
  totalSize: number
  /** 按文件夹分组的大小统计（Top 10） */
  topFolders: FolderStat[]
  /** 按文件类型分组的大小统计 */
  typeDistribution: TypeStat[]
  /** 最大文件 Top 10 */
  topFiles: FileItem[]
  /** 数据生成时间戳 */
  generatedAt: string
}

/* ---------- 缓存机制 ---------- */

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 分钟
let cachedResult: StorageStatsResult | null = null
let cacheTimestamp = 0

/* ---------- 工具函数 ---------- */

/** 最大递归深度限制 */
const MAX_DEPTH = 5

/** 文件类型分组映射 */
const MIME_CATEGORY_MAP: Record<string, string> = {
  // 图片
  'image/': '图片',
  // 视频
  'video/': '视频',
  // 文档
  'application/pdf': '文档',
  'application/msword': '文档',
  'application/vnd.openxmlformats-officedocument': '文档',
  'text/plain': '文档',
  'text/markdown': '文档',
  'text/html': '文档',
  'application/epub+zip': '文档',
}

/** 根据 MIME 类型判断文件类型分组 */
function getFileCategory(mimeType: string | null): string {
  if (!mimeType) return '其它'
  for (const [prefix, category] of Object.entries(MIME_CATEGORY_MAP)) {
    if (mimeType.startsWith(prefix) || mimeType === prefix) {
      return category
    }
  }
  return '其它'
}

/** 从文件路径中提取顶层文件夹名 */
function getTopLevelFolder(filePath: string): string {
  const parts = filePath.split('/')
  if (parts.length <= 1) return '/'
  return parts[0] ?? '/'
}

/* ---------- 递归扫描 ---------- */

/**
 * 递归扫描目录，收集所有文件信息
 * @param provider 存储提供者
 * @param dirPath 当前目录路径
 * @param depth 当前递归深度
 * @param files 收集到的文件列表
 */
async function scanDirectory(
  provider: { listDirectory: (path: string) => Promise<{ filename: string; basename: string; type: string; size: number; mime?: string }[]> },
  dirPath: string,
  depth: number,
  files: FileItem[],
): Promise<void> {
  if (depth > MAX_DEPTH) return

  let entries: { filename: string; basename: string; type: string; size: number; mime?: string }[]
  try {
    entries = await provider.listDirectory(dirPath)
  } catch (err) {
    // 目录不可访问（如 404、权限不足等），静默跳过
    console.warn(`[storage.stats] 跳过不可访问目录: ${dirPath}`, (err as Error).message)
    return
  }

  for (const entry of entries) {
    if (entry.type === 'directory') {
      // 递归进入子目录
      const subPath = dirPath ? `${dirPath}/${entry.filename}` : entry.filename
      await scanDirectory(provider, subPath, depth + 1, files)
    } else {
      // 记录文件信息
      const relativePath = dirPath ? `${dirPath}/${entry.filename}` : entry.filename
      files.push({
        name: entry.filename,
        path: relativePath,
        size: entry.size,
        mimeType: entry.mime ?? null,
      })
    }
  }
}

/**
 * 执行完整的存储空间分析
 */
async function collectStats(): Promise<StorageStatsResult> {
  const provider = await getStorageProvider()

  // 从根目录开始递归扫描
  const allFiles: FileItem[] = []
  await scanDirectory(provider, '', 0, allFiles)

  // 汇总统计
  let totalSize = 0
  const folderSizeMap = new Map<string, { size: number; count: number }>()
  const typeSizeMap = new Map<string, { size: number; count: number }>()

  for (const file of allFiles) {
    totalSize += file.size

    // 文件夹大小统计（取顶层文件夹）
    const topFolder = getTopLevelFolder(file.path)
    const folderEntry = folderSizeMap.get(topFolder) ?? { size: 0, count: 0 }
    folderEntry.size += file.size
    folderEntry.count += 1
    folderSizeMap.set(topFolder, folderEntry)

    // 文件类型统计
    const category = getFileCategory(file.mimeType)
    const typeEntry = typeSizeMap.get(category) ?? { size: 0, count: 0 }
    typeEntry.size += file.size
    typeEntry.count += 1
    typeSizeMap.set(category, typeEntry)
  }

  // 文件夹 Top 10（按大小降序）
  const topFolders: FolderStat[] = Array.from(folderSizeMap.entries())
    .map(([path, stat]) => ({ path, ...stat }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 10)

  // 文件类型分布（按大小降序）
  const typeDistribution: TypeStat[] = Array.from(typeSizeMap.entries())
    .map(([category, stat]) => ({ category, ...stat }))
    .sort((a, b) => b.size - a.size)

  // 最大文件 Top 10
  const topFiles: FileItem[] = [...allFiles]
    .sort((a, b) => b.size - a.size)
    .slice(0, 10)

  return {
    totalFiles: allFiles.length,
    totalSize,
    topFolders,
    typeDistribution,
    topFiles,
    generatedAt: new Date().toISOString(),
  }
}

/* ---------- API 路由 ---------- */

export const GET = apiHandler(
  'GET',
  { label: 'storage.stats', requireAdmin: true },
  async () => {
    if (!isStorageConfigured()) return storageNotConfigured()

    // 检查缓存是否有效
    const now = Date.now()
    if (cachedResult && now - cacheTimestamp < CACHE_TTL_MS) {
      return NextResponse.json(cachedResult, {
        headers: { 'Cache-Control': 'private, max-age=300' },
      })
    }

    try {
      const result = await collectStats()

      // 更新缓存
      cachedResult = result
      cacheTimestamp = now

      console.warn(`[storage.stats] 分析完成: ${result.totalFiles} 个文件, ${result.totalSize} 字节`)
      return NextResponse.json(result, {
        headers: { 'Cache-Control': 'private, max-age=300' },
      })
    } catch (err) {
      console.error('[storage.stats] 分析失败', err)
      return NextResponse.json(
        { error: '存储分析失败' },
        { status: 500 },
      )
    }
  }
)
