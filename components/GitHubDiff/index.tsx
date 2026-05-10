'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Button, Tag, message } from 'antd';
import { Github, CheckCircle2, Plus, Minus } from 'lucide-react';

interface DiffLine {
  type: 'add' | 'remove' | 'unchanged';
  lineNumber: number;
  content: string;
}

interface GitHubDiffProps {
  filePath: string;
  repo: string;
  oldContent: string;
  newContent: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function GitHubDiffModal({
  filePath,
  repo,
  oldContent,
  newContent,
  onConfirm,
  onCancel,
  loading = false,
}: GitHubDiffProps) {
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [stats, setStats] = useState({ added: 0, removed: 0 });

  useEffect(() => {
    const computeDiff = () => {
      const oldLines = oldContent.split('\n');
      const newLines = newContent.split('\n');
      const lines: DiffLine[] = [];
      let added = 0;
      let removed = 0;

      const maxLen = Math.max(oldLines.length, newLines.length);
      for (let i = 0; i < maxLen; i++) {
        const oldLine = oldLines[i];
        const newLine = newLines[i];

        if (oldLine === undefined) {
          lines.push({ type: 'add', lineNumber: i + 1, content: newLine || '' });
          added++;
        } else if (newLine === undefined) {
          lines.push({ type: 'remove', lineNumber: i + 1, content: oldLine });
          removed++;
        } else if (oldLine !== newLine) {
          lines.push({ type: 'remove', lineNumber: i + 1, content: oldLine });
          lines.push({ type: 'add', lineNumber: i + 1, content: newLine });
          added++;
          removed++;
        } else {
          lines.push({ type: 'unchanged', lineNumber: i + 1, content: oldLine });
        }
      }

      setDiffLines(lines);
      setStats({ added, removed });
    };

    computeDiff();
  }, [oldContent, newContent]);

  return (
    <Modal
      title={null}
      open={true}
      onCancel={onCancel}
      width={800}
      footer={null}
      centered
      destroyOnClose
    >
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-zinc-200">
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
            <Github size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900">GitHub 配置变更确认</h2>
            <p className="text-sm text-zinc-500">
              仓库: <span className="font-mono">{repo}</span> · 文件: <span className="font-mono">{filePath}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <Tag icon={<Plus size={12} />} color="success" className="flex items-center gap-1">
            +{stats.added} 行
          </Tag>
          <Tag icon={<Minus size={12} />} color="error" className="flex items-center gap-1">
            -{stats.removed} 行
          </Tag>
        </div>

        <div className="bg-zinc-900 rounded-xl p-4 max-h-96 overflow-auto font-mono text-sm">
          {diffLines.map((line, idx) => (
            <div
              key={idx}
              className={`flex ${
                line.type === 'add'
                  ? 'bg-green-900/30 text-green-400'
                  : line.type === 'remove'
                  ? 'bg-red-900/30 text-red-400'
                  : 'text-zinc-500'
              }`}
            >
              <span className="w-12 text-right pr-4 select-none shrink-0 text-zinc-600">
                {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
              </span>
              <span className="flex-1 break-all">{line.content}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={onCancel} disabled={loading}>
            取消
          </Button>
          <Button
            type="primary"
            loading={loading}
            onClick={onConfirm}
            className="bg-zinc-900 hover:bg-zinc-800"
            icon={loading ? null : <CheckCircle2 size={14} />}
          >
            {loading ? '提交中...' : '确认提交'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface GitHubDiffManagerProps {
  children: (props: {
    showDiff: (params: { filePath: string; oldContent: string; newContent: string; onConfirm: () => void }) => void;
  }) => React.ReactNode;
}

export function GitHubDiffProvider({ children }: GitHubDiffManagerProps) {
  const [modalData, setModalData] = useState<{
    filePath: string;
    repo: string;
    oldContent: string;
    newContent: string;
    onConfirm: () => void;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const showDiff = (params: {
    filePath: string;
    oldContent: string;
    newContent: string;
    onConfirm: () => void;
  }) => {
    const repo = process.env.NEXT_PUBLIC_GITHUB_REPO || '';
    setModalData({ ...params, repo });
  };

  const handleConfirm = async () => {
    if (!modalData) return;
    setLoading(true);
    try {
      await modalData.onConfirm();
      message.success('配置已同步到 GitHub');
    } catch {
      message.error('同步失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setModalData(null);
  };

  return (
    <>
      {children({ showDiff })}
      {modalData && (
        <GitHubDiffModal
          filePath={modalData.filePath}
          repo={modalData.repo}
          oldContent={modalData.oldContent}
          newContent={modalData.newContent}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          loading={loading}
        />
      )}
    </>
  );
}

export default GitHubDiffModal;