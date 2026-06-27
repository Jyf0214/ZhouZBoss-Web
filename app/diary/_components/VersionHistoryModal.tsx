/**
 * 日记版本历史弹窗
 * 展示版本列表，点击可查看版本内容详情
 */
'use client';

import React, { useState, useCallback } from 'react';
import { Modal, Spin, Empty } from 'antd';
import { History, ChevronLeft, Clock, Tag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { showError } from '@/lib/error';

interface VersionSummary {
  id: string;
  title: string | null;
  tags: string | null;
  createdAt: string;
}

interface VersionDetail {
  id: string;
  title: string | null;
  content: string;
  tags: string[];
  createdAt: string;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  try { return JSON.parse(tags); } catch { return []; }
}

interface Props {
  open: boolean;
  diaryId: string;
  onClose: () => void;
}

export function VersionHistoryModal({ open, diaryId, onClose }: Props) {
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<VersionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchVersions = useCallback(async () => {
    if (fetched) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/diary/${diaryId}/versions`);
      if (!res.ok) throw new Error('加载版本历史失败');
      const json = await res.json();
      setVersions(json.versions ?? []);
      setFetched(true);
    } catch {
      showError('加载版本历史失败');
    } finally {
      setLoading(false);
    }
  }, [diaryId, fetched]);

  const fetchDetail = useCallback(async (versionId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/diary/${diaryId}/versions/${versionId}`);
      if (!res.ok) throw new Error('加载版本详情失败');
      const json = await res.json();
      setSelectedVersion(json.version);
    } catch {
      showError('加载版本详情失败');
    } finally {
      setDetailLoading(false);
    }
  }, [diaryId]);

  const handleClose = useCallback(() => {
    setSelectedVersion(null);
    onClose();
  }, [onClose]);

  // 当弹窗打开时触发加载
  React.useEffect(() => {
    if (open && !fetched) void fetchVersions();
  }, [open, fetched, fetchVersions]);

  // 关闭时重置状态
  React.useEffect(() => {
    if (!open) {
      setFetched(false);
      setVersions([]);
      setSelectedVersion(null);
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      title={selectedVersion ? '版本详情' : '版本历史'}
      destroyOnClose
      width="min(560px, 90vw)"
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
    >
      {selectedVersion ? (
        /* 版本详情视图 */
        <div>
          <Button
            variant="ghost"
            size="sm"
            autoLoading={false}
            icon={<ChevronLeft size={14} />}
            onClick={() => setSelectedVersion(null)}
            className="mb-4"
          >
            返回列表
          </Button>

          <div className="border border-zinc-100 rounded-xl p-4 bg-zinc-50 mb-4">
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
              <Clock size={14} />
              <span>{formatDateTime(selectedVersion.createdAt)}</span>
            </div>
            {selectedVersion.title && (
              <h4 className="text-lg font-bold text-zinc-900 mb-1">{selectedVersion.title}</h4>
            )}
            {selectedVersion.tags.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Tag size={12} />
                <span>{selectedVersion.tags.join(', ')}</span>
              </div>
            )}
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spin size="small" />
            </div>
          ) : (
            <div className="prose prose-zinc max-w-none prose-sm">
              <MarkdownRenderer content={selectedVersion.content} />
            </div>
          )}
        </div>
      ) : (
        /* 版本列表视图 */
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spin size="small" />
            </div>
          ) : versions.length === 0 ? (
            <Empty description="暂无版本历史" />
          ) : (
            <div className="space-y-2">
              {versions.map((v) => {
                const tags = parseTags(v.tags);
                return (
                  <button
                    key={v.id}
                    className="w-full text-left p-3 sm:p-4 rounded-xl border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 transition-colors cursor-pointer"
                    onClick={() => fetchDetail(v.id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">
                          {v.title ?? '无标题'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                          <Clock size={12} />
                          <span>{formatDateTime(v.createdAt)}</span>
                          {tags.length > 0 && (
                            <>
                              <Tag size={12} />
                              <span className="truncate">{tags.join(', ')}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <History size={16} className="text-zinc-300 shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default VersionHistoryModal;
