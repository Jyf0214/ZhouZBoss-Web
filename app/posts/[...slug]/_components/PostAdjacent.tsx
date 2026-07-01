import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AdjacentPost {
  slug: string;
  title: string;
}

export type { AdjacentPost };

export function PostAdjacent({
  prev,
  next,
}: {
  prev?: AdjacentPost | null;
  next?: AdjacentPost | null;
}) {
  if (!prev && !next) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
      {prev ? (
        <Link
          href={`/posts${prev.slug}`}
          className="group flex flex-col p-6 rounded-2xl bg-zinc-900 dark:bg-zinc-800 border border-zinc-800 dark:border-zinc-700 hover:border-zinc-700 dark:hover:border-zinc-500 hover:shadow-xl hover:shadow-zinc-900/20 transition-all duration-300 min-w-0"
        >
          <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 mb-3">
            <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            上一篇
          </span>
          <span className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors line-clamp-2 leading-relaxed">
            {prev.title}
          </span>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={`/posts${next.slug}`}
          className="group flex flex-col p-6 rounded-2xl bg-zinc-900 dark:bg-zinc-800 border border-zinc-800 dark:border-zinc-700 hover:border-zinc-700 dark:hover:border-zinc-500 hover:shadow-xl hover:shadow-zinc-900/20 transition-all duration-300 min-w-0 text-right sm:order-last"
        >
          <span className="flex items-center justify-end gap-1.5 text-xs font-medium text-zinc-500 mb-3">
            下一篇
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </span>
          <span className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors line-clamp-2 leading-relaxed">
            {next.title}
          </span>
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
