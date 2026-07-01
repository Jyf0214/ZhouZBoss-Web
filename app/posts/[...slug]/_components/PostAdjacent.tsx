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
          className="group flex flex-col p-5 rounded-2xl border border-zinc-100 bg-white hover:border-zinc-300 hover:shadow-lg transition-all duration-300 min-w-0"
        >
          <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 mb-2">
            <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            上一篇
          </span>
          <span className="text-sm font-semibold text-zinc-800 group-hover:text-zinc-900 transition-colors line-clamp-2 leading-relaxed">
            {prev.title}
          </span>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={`/posts${next.slug}`}
          className="group flex flex-col p-5 rounded-2xl border border-zinc-100 bg-white hover:border-zinc-300 hover:shadow-lg transition-all duration-300 min-w-0 text-right sm:order-last"
        >
          <span className="flex items-center justify-end gap-1.5 text-xs font-medium text-zinc-400 mb-2">
            下一篇
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </span>
          <span className="text-sm font-semibold text-zinc-800 group-hover:text-zinc-900 transition-colors line-clamp-2 leading-relaxed">
            {next.title}
          </span>
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
