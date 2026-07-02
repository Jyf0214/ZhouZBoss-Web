'use client';

// Markdown 正文编辑 / 预览区块
import { Eye, Code } from 'lucide-react';
import { Textarea } from '@/components/ui/Textarea';
import { useI18n } from '@/hooks/use-i18n';

interface MarkdownBodySectionProps {
  showPreview: boolean;
  onTogglePreview: () => void;
  body: string;
  onBodyChange: (v: string) => void;
  previewContent: string;
}

export function MarkdownBodySection({
  showPreview, onTogglePreview,
  body, onBodyChange, previewContent,
}: MarkdownBodySectionProps) {
  const { t } = useI18n();
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-zinc-900">{t('tickets.markdownBody')}</h2>
        <button
          onClick={onTogglePreview}
          className="flex items-center gap-1 text-sm text-zinc-500"
        >
          {showPreview ? <Code size={14} /> : <Eye size={14} />}
          {showPreview ? t('tickets.editor') : t('tickets.preview')}
        </button>
      </div>
      {showPreview ? (
        <pre className="p-3 bg-zinc-50 rounded-lg text-xs overflow-auto whitespace-pre-wrap">
          {previewContent}
        </pre>
      ) : (
        <Textarea
          minH="min-h-[200px]"
          rounded="sm"
          value={body}
          onChange={e => onBodyChange(e.target.value)}
          className="font-mono"
          placeholder={t('tickets.placeholderBody')}
        />
      )}
    </div>
  );
}
