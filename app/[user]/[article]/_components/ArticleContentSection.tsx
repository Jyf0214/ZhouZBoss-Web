'use client';

import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import type { FrontendConfig } from '@/hooks/use-config';

export function ArticleContentSection({
  showRaw,
  rawContent,
  content,
  highlight,
}: {
  showRaw: boolean;
  rawContent: string;
  content: string;
  highlight: FrontendConfig['highlight'] | undefined;
}) {
  if (showRaw && rawContent) {
    return (
      <pre className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 overflow-x-auto font-mono text-sm leading-relaxed whitespace-pre-wrap">
        {rawContent}
      </pre>
    );
  }
  return <MarkdownRenderer content={content} highlight={highlight} />;
}
