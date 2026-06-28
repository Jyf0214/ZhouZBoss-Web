'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, Key, Plus, Trash2, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProCard } from '@/components/ui/ProCard';

interface ApiKeyItem {
  id: string;
  name: string;
  lastUsed: string | null;
  createdAt: string;
}

export function ApiKeyCard() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/api-keys');
      if (res.ok) {
        const data = (await res.json()) as { keys: ApiKeyItem[] };
        setKeys(data.keys ?? []);
        setError(null);
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? `请求失败 (${res.status})`);
      }
    } catch {
      setError('网络请求失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName || undefined }),
      });
      if (res.ok) {
        const data = (await res.json()) as ApiKeyItem & { key: string };
        setShowNewKey(data.key);
        setNewKeyName('');
        await loadKeys();
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? `生成失败 (${res.status})`);
      }
    } catch {
      setError('网络请求失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('复制到剪贴板失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    setConfirmDeleteId(null);
    setError(null);
    try {
      const res = await fetch(`/api/auth/api-keys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? `删除失败 (${res.status})`);
      }
    } catch {
      setError('网络请求失败');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (s: string) => {
    const d = new Date(s);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <ProCard className="mt-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
          <Key size={16} className="text-zinc-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">API 密钥</h3>
          <p className="text-xs text-zinc-400">用于替代 Cookie 进行 API 认证（Authorization: Bearer sk-xxx）</p>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 新建密钥输入 */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="密钥名称（可选）"
          className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-300"
          onKeyDown={(e) => { if (e.key === 'Enter') void handleGenerate(); }}
        />
        <Button
          variant="primary"
          size="sm"
          autoLoading={false}
          onClick={handleGenerate}
          disabled={generating}
          loading={generating}
        >
          {generating ? (
            <><Loader2 size={14} className="inline mr-1 animate-spin" />生成中…</>
          ) : (
            <><span className="hidden sm:inline"><Plus size={14} className="inline mr-1" />生成密钥</span><span className="sm:hidden"><Plus size={14} /></span></>
          )}
        </Button>
      </div>

      {/* 新密钥明文展示（仅一次） */}
      {showNewKey && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700 mb-2 font-medium">请立即复制此密钥，关闭后将无法再次查看：</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm bg-white px-3 py-2 rounded border border-amber-200 font-mono break-all">{showNewKey}</code>
            <button
              type="button"
              onClick={() => void handleCopy(showNewKey)}
              className="shrink-0 p-2 hover:bg-amber-100 rounded-lg transition-colors"
            >
              {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-amber-600" />}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowNewKey(null)}
            className="mt-2 text-xs text-amber-600 hover:underline"
          >
            我已复制，关闭
          </button>
        </div>
      )}

      {/* 密钥列表 */}
      {loading ? (
        <p className="text-sm text-zinc-400 py-4">加载中…</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-zinc-400 py-4">暂无 API 密钥</p>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => {
            const isDeleting = deletingId === k.id;
            const isConfirming = confirmDeleteId === k.id;
            return (
              <div key={k.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-100 overflow-hidden">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{k.name}</p>
                  <p className="text-xs text-zinc-400">
                    创建于 {formatDate(k.createdAt)}
                    {k.lastUsed && ` · 最后使用 ${formatDate(k.lastUsed)}`}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  {isConfirming ? (
                    <>
                      <Button
                        variant="danger"
                        size="sm"
                        autoLoading={false}
                        loading={isDeleting}
                        onClick={() => void handleDelete(k.id)}
                        disabled={isDeleting}
                        className="whitespace-nowrap"
                      >
                        {isDeleting ? <Loader2 size={12} className="animate-spin" /> : '确认'}
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        autoLoading={false}
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={isDeleting}
                        className="whitespace-nowrap"
                      >
                        取消
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="danger"
                      size="sm"
                      iconOnly
                      autoLoading={false}
                      onClick={() => setConfirmDeleteId(k.id)}
                      disabled={isDeleting}
                      title="撤销密钥"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ProCard>
  );
}
