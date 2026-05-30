'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Button, message } from 'antd';
import { Github, CheckCircle2 } from 'lucide-react';
import { createTwoFilesPatch } from 'diff';

interface GitHubDiffProps {
  filePath: string;
  repo: string;
  oldContent: string;
  newContent: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  open?: boolean;
}

interface DiffLine {
  type: 'add' | 'del' | 'ctx';
  text: string;
}

interface DiffHunk {
  lines: DiffLine[];
}

function parseUnifiedDiff(patch: string): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  let current: DiffHunk | null = null;

  for (const line of patch.split('\n')) {
    if (line.startsWith('@@')) {
      if (current) hunks.push(current);
      current = { lines: [] };
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      current?.lines.push({ type: 'add', text: line.slice(1) });
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      current?.lines.push({ type: 'del', text: line.slice(1) });
    } else if (line.startsWith(' ')) {
      current?.lines.push({ type: 'ctx', text: line.slice(1) });
    }
  }
  if (current) hunks.push(current);
  return hunks;
}

export function GitHubDiffModal({
  filePath,
  repo,
  oldContent,
  newContent,
  onConfirm,
  onCancel,
  loading = false,
  open = false,
}: GitHubDiffProps) {
  const [hunks, setHunks] = useState<DiffHunk[]>([]);

  useEffect(() => {
    const patch = createTwoFilesPatch('', '', oldContent ?? '', newContent ?? '', '', '', { context: 3 });
    setHunks(parseUnifiedDiff(patch));
  }, [oldContent, newContent]);

  return (
    <Modal
      title={null}
      open={open}
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

        <div className="bg-zinc-900 rounded-xl max-h-96 overflow-auto font-mono text-sm leading-5">
          {hunks.length === 0 && (
            <div className="text-zinc-500 text-center py-4">无变更</div>
          )}
          {hunks.map((hunk, hi) => (
            <div key={hi}>
              {hi > 0 && <div className="h-px bg-zinc-700 mx-4" />}
              {hunk.lines.map((line, li) => {
                let bg = '';
                let fg = 'text-zinc-400';
                let prefix = ' ';
                if (line.type === 'add') { bg = 'bg-green-900/30'; fg = 'text-green-300'; prefix = '+'; }
                if (line.type === 'del') { bg = 'bg-red-900/30'; fg = 'text-red-300'; prefix = '-'; }
                return (
                  <div key={li} className={`${bg} ${fg} px-4 whitespace-pre-wrap`}>
                    <span className="select-none w-4 inline-block text-center mr-3 opacity-60">{prefix}</span>
                    {line.text}
                  </div>
                );
              })}
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
            '确认提交'
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
    const repo = process.env.NEXT_PUBLIC_GITHUB_REPO ?? '';
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
