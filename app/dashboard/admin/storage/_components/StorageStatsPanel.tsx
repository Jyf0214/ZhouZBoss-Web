/**
 * 存储空间分析面板
 *
 * 展示存储池的空间维度分析结果:
 * - 数据卡片：总文件数、总大小
 * - 文件夹占用列表（纯 CSS 条形图）
 * - 文件类型分布列表
 * - 最大文件 Top 10 表格
 */
'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, FolderOpen, FileText, Image, Film, HelpCircle } from 'lucide-react'
import { ProCard } from '@/components/ui/ProCard'
import { Button } from '@/components/ui/Button'

/* ---------- 类型定义 ---------- */

/** 文件夹统计项 */
interface FolderStat {
  path: string
  size: number
  count: number
}

/** 文件类型统计项 */
interface TypeStat {
  category: string
  size: number
  count: number
}

/** 最大文件项 */
interface TopFile {
  name: string
  path: string
  size: number
  mimeType: string | null
}

/** API 返回的统计结果 */
interface StorageStatsResult {
  totalFiles: number
  totalSize: number
  topFolders: FolderStat[]
  typeDistribution: TypeStat[]
  topFiles: TopFile[]
  generatedAt: string
}

/* ---------- 工具函数 ---------- */

/** 格式化文件大小为可读字符串 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
  return `${(bytes / 1073741824).toFixed(2)} GB`
}

/** 获取类型分组的图标 */
function getTypeIcon(category: string) {
  switch (category) {
    case '图片': return <Image size={14} className="text-blue-500" />
    case '视频': return <Film size={14} className="text-purple-500" />
    case '文档': return <FileText size={14} className="text-green-500" />
    default: return <HelpCircle size={14} className="text-zinc-400" />
  }
}

/** 计算百分比 */
function percent(size: number, total: number): number {
  if (total === 0) return 0
  return Math.round((size / total) * 1000) / 10
}

/* ---------- 组件 ---------- */

interface StorageStatsPanelProps {
  open: boolean
  onClose: () => void
}

export function StorageStatsPanel({ open, onClose }: StorageStatsPanelProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<StorageStatsResult | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/storage/stats')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `请求失败 (${res.status})`)
      }
      const result: StorageStatsResult = await res.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  // 首次打开时加载数据
  useEffect(() => {
    if (open && !data && !loading) {
      void fetchStats()
    }
  }, [open, data, loading, fetchStats])

  // 面板关闭后保留数据（下次打开可复用缓存），仅在打开时无数据才请求
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col mx-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-lg font-bold text-zinc-900">存储空间分析</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
              onClick={() => void fetchStats()}
              disabled={loading}
            >
              刷新
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* 加载中 */}
          {loading && !data && (
            <div className="py-16 text-center text-zinc-400 text-sm">
              正在扫描存储池…
            </div>
          )}

          {/* 错误 */}
          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* 数据展示 */}
          {data && (
            <>
              {/* 数据卡片 */}
              <div className="grid grid-cols-2 gap-4">
                <ProCard padding="p-4">
                  <div className="text-xs text-zinc-400 mb-1">总文件数</div>
                  <div className="text-2xl font-bold text-zinc-900">
                    {data.totalFiles.toLocaleString()}
                  </div>
                </ProCard>
                <ProCard padding="p-4">
                  <div className="text-xs text-zinc-400 mb-1">总大小</div>
                  <div className="text-2xl font-bold text-zinc-900">
                    {formatBytes(data.totalSize)}
                  </div>
                </ProCard>
              </div>

              {/* 文件夹占用 Top 10 */}
              {data.topFolders.length > 0 && (
                <ProCard title="文件夹占用 Top 10" padding="p-4">
                  <div className="space-y-3">
                    {data.topFolders.map((folder) => {
                      const pct = percent(folder.size, data.totalSize)
                      return (
                        <div key={folder.path}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="flex items-center gap-1.5 text-zinc-700 font-medium truncate">
                              <FolderOpen size={13} className="text-zinc-400 shrink-0" />
                              {folder.path === '/' ? '根目录' : folder.path}
                            </span>
                            <span className="text-zinc-500 tabular-nums shrink-0 ml-2">
                              {formatBytes(folder.size)}
                              <span className="text-zinc-400 ml-1">({folder.count} 文件)</span>
                            </span>
                          </div>
                          {/* 纯 CSS 条形图 */}
                          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(pct, 1)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ProCard>
              )}

              {/* 文件类型分布 */}
              {data.typeDistribution.length > 0 && (
                <ProCard title="文件类型分布" padding="p-4">
                  <div className="space-y-3">
                    {data.typeDistribution.map((type) => {
                      const pct = percent(type.size, data.totalSize)
                      return (
                        <div key={type.category}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="flex items-center gap-1.5 text-zinc-700 font-medium">
                              {getTypeIcon(type.category)}
                              {type.category}
                            </span>
                            <span className="text-zinc-500 tabular-nums">
                              {formatBytes(type.size)}
                              <span className="text-zinc-400 ml-1">
                                ({type.count} 文件 · {pct}%)
                              </span>
                            </span>
                          </div>
                          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(pct, 1)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ProCard>
              )}

              {/* 最大文件 Top 10 */}
              {data.topFiles.length > 0 && (
                <ProCard title="最大文件 Top 10" padding="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-100 text-left text-zinc-500">
                          <th className="px-4 py-3 font-medium w-8">#</th>
                          <th className="px-4 py-3 font-medium">文件名</th>
                          <th className="px-4 py-3 font-medium">路径</th>
                          <th className="px-4 py-3 font-medium text-right">大小</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topFiles.map((file, idx) => (
                          <tr
                            key={file.path}
                            className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50"
                          >
                            <td className="px-4 py-2.5 text-zinc-400 tabular-nums">{idx + 1}</td>
                            <td className="px-4 py-2.5 text-zinc-700 font-medium truncate max-w-[200px]">
                              {file.name}
                            </td>
                            <td className="px-4 py-2.5 text-zinc-400 truncate max-w-[250px]">
                              {file.path}
                            </td>
                            <td className="px-4 py-2.5 text-zinc-600 text-right tabular-nums">
                              {formatBytes(file.size)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ProCard>
              )}

              {/* 数据时间戳 */}
              <div className="text-xs text-zinc-400 text-right">
                数据生成于 {new Date(data.generatedAt).toLocaleString('zh-CN')}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
