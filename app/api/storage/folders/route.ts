/**
 * 存储池文件夹元数据列表
 * GET /api/storage/folders
 * 读取 Prisma `storageFolder` 表全部记录(按路径升序)
 */
import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getDb } from '@/lib/db'
import { isWebDavConfigured } from '@/lib/webdav'
import {
  databaseNotConfigured,
  listAllFolderMetas,
  webdavNotConfigured,
} from '../_helpers'

export const GET = apiHandler(
  'GET',
  { label: 'storage.folders', requireAdmin: true },
  async () => {
    if (!isWebDavConfigured()) return webdavNotConfigured()
    if (!getDb().prisma) return databaseNotConfigured()
    const folders = await listAllFolderMetas()
    console.warn(`[storage.folders] 共 ${folders.length} 个文件夹元数据`)
    return NextResponse.json({ folders })
  }
)
