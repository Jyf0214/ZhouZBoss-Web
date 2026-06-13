/**
 * 存储池全局配置状态查询
 * GET /api/storage/config
 * 返回 WebDAV 是否配置 + 数据库已记录文件夹数量
 */
import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { isWebDavConfigured, listAllFolderMetas } from '../_helpers'

export const GET = apiHandler(
  'GET',
  { label: 'storage.config', requireAdmin: true },
  async () => {
    const configured = isWebDavConfigured()
    // 未配置时也允许读 folder 数量(只读 KV,不依赖 WebDAV)
    const folders = configured ? await listAllFolderMetas() : []
    console.warn(`[storage.config] webdav=${configured} folderCount=${folders.length}`)
    return NextResponse.json({
      configured,
      folderCount: folders.length,
    })
  }
)
