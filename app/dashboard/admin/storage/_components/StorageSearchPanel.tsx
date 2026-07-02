/**
 * 存储池文件内容搜索面板
 *
 * 展示搜索输入框 + 结果列表。
 * 输入关键词后调用 /api/storage/search?q=xxx，
 * 结果以列表形式展示：文件名、路径、匹配片段（高亮关键词）。
 * 点击结果跳转到文件预览。
 */
'use client'

import { useCallback, useRef, useState } from 'react'
import { Search, X, FileText, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/* ---------- 类型定义 ---------- */

/** 匹配的上下文片段 */
interface SearchMatch {
  snippet: string
  offset: number
}

/** 单个搜索结果 */
interface SearchResult {
  path: string
  filename: string
  matches: SearchMatch[]
}

/** API 返回结构 */
interface SearchResponse {
  query: string
  fileCount: number
  results: SearchResult[]
  searchedAt: string
  truncated: boolean
}

/* ---------- Props ---------- */

interface StorageSearchPanelProps {
  /** 面板是否可见 */
  open: boolean
  /** 关闭面板 */
  onClose: () => void
  /** 点击结果时的回调，传入文件路径（用于跳转预览等） */
  onResultClick?: (path: string, filename: string) => void
}

/* ---------- 关键词高亮 ---------- */

/** 将关键词从文本中提取为高亮片段 */
function highlightKeyword(text: string, keyword: string): { text: string; highlighted: boolean }[] {
  if (!keyword) return [{ text, highlighted: false }]

  const lowerText = text.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  const parts: { text: string; highlighted: boolean }[] = []
  let searchStart = 0

  while (searchStart < text.length) {
    const idx = lowerText.indexOf(lowerKeyword, searchStart)
    if (idx === -1) {
      parts.push({ text: text.slice(searchStart), highlighted: false })
      break
    }
    if (idx > searchStart) {
      parts.push({ text: text.slice(searchStart, idx), highlighted: false })
    }
    parts.push({ text: text.slice(idx, idx + keyword.length), highlighted: true })
    searchStart = idx + keyword.length
  }

  return parts
}

/* ---------- 组件 ---------- */

export function StorageSearchPanel({ open, onClose, onResultClick }: StorageSearchPanelProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [truncated, setTruncated] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSearch = useCallback(async () => {
    const q = query.trim()
    if (q.length < 2) {
      setError('搜索关键词至少 2 个字符')
      return
    }

    setLoading(true)
    setError(null)
    setResults([])
    setTruncated(false)
    setHasSearched(true)

    try {
      const res = await fetch(`/api/storage/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? '搜索失败')
        return
      }

      const response = data as SearchResponse
      setResults(response.results)
      setTruncated(response.truncated)
    } catch (err) {
      setError(`搜索请求失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }, [query])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        void handleSearch()
      }
    },
    [handleSearch],
  )

  const handleClear = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
    setHasSearched(false)
    setTruncated(false)
    inputRef.current?.focus()
  }, [])

  if (!open) return null

  return (
    <div className="border-b border-zinc-100 bg-zinc-50/50 px-4 py-3">
      {/* 搜索输入行 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索文件内容… (至少 2 个字符)"
            className="w-full pl-9 pr-8 py-2 text-sm border border-zinc-200 rounded-lg
                       bg-white text-zinc-900 placeholder:text-zinc-400
                       focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400
                       transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          onClick={() => void handleSearch()}
          disabled={loading || query.trim().length < 2}
        >
          搜索
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onClose}
          autoLoading={false}
        >
          关闭
        </Button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 搜索结果 */}
      {hasSearched && !loading && !error && (
        <div className="mt-2">
          {results.length === 0 ? (
            <div className="text-sm text-zinc-400 py-4 text-center">
              未找到匹配「{query}」的文件内容
            </div>
          ) : (
            <>
              <div className="text-xs text-zinc-500 mb-2">
                找到 {results.length} 个匹配文件
                {truncated && '（结果已达上限，部分文件未显示）'}
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {results.map((result) => (
                  <button
                    key={result.path}
                    type="button"
                    onClick={() => onResultClick?.(result.path, result.filename)}
                    className="w-full text-left p-2.5 rounded-lg bg-white border border-zinc-200
                               hover:border-blue-300 hover:bg-blue-50/50 transition-colors group"
                  >
                    {/* 文件信息行 */}
                    <div className="flex items-center gap-2 mb-1">
                      <FileText size={13} className="text-zinc-400 shrink-0" />
                      <span className="text-sm font-medium text-zinc-800 truncate">
                        {result.filename}
                      </span>
                      <span className="text-xs text-zinc-400 truncate flex-1">
                        {result.path}
                      </span>
                      <ExternalLink size={12} className="text-zinc-300 group-hover:text-blue-400 shrink-0" />
                    </div>
                    {/* 匹配片段（取第一个） */}
                    {result.matches[0] && (
                      <div className="text-xs text-zinc-500 leading-relaxed pl-5">
                        {highlightKeyword(result.matches[0].snippet, query).map((part, i) =>
                          part.highlighted ? (
                            <mark key={i} className="bg-yellow-200 text-zinc-800 rounded px-0.5">
                              {part.text}
                            </mark>
                          ) : (
                            <span key={i}>{part.text}</span>
                          ),
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
