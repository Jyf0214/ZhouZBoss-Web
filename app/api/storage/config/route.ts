/**
 * 存储池全局配置状态查询
 * GET /api/storage/config
 * 返回 WebDAV 是否配置 + 数据库已记录文件夹数量
 */
import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getSessionWithKeyId, requireApiKeyPermission } from '@/lib/auth'
import { isStorageConfigured, listAllFolderMetas } from '../_helpers'

export const GET = apiHandler(
  'GET',
  { label: 'storage.config', requireAdmin: true },
  async () => {
    // API 密钥权限检查
    const authResult = await getSessionWithKeyId()
    if (authResult) {
      const permErr = await requireApiKeyPermission(authResult.session, authResult.currentKeyId, 'settings_read')
      if (permErr) return permErr
    }

    const configured = isStorageConfigured()
    // 未配置时也允许读 folder 数量(只读 KV,不依赖存储后端)
    const folders = configured ? await listAllFolderMetas() : []
    console.warn(`[storage.config] storage=${configured} folderCount=${folders.length}`)
    return NextResponse.json({
      configured,
      folderCount: folders.length,
    })
  }
)
