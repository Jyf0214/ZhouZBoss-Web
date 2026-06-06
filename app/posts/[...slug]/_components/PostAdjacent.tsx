import Link from 'next/link';

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
    <div className="flex justify-between gap-4 mb-8">
      {prev ? (
        <Link
          href={prev.slug}
          className="group flex-1 flex flex-col p-4 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors min-w-0"
        >
          <span className="text-xs text-zinc-400 mb-1">← 上一篇</span>
          <span className="text-sm font-medium text-zinc-700 group-hover:text-zinc-900 transition-colors truncate">
            {prev.title}
          </span>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
      {next ? (
        <Link
          href={next.slug}
          className="group flex-1 flex flex-col p-4 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors min-w-0 text-right"
        >
          <span className="text-xs text-zinc-400 mb-1">下一篇 →</span>
          <span className="text-sm font-medium text-zinc-700 group-hover:text-zinc-900 transition-colors truncate">
            {next.title}
          </span>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
}
