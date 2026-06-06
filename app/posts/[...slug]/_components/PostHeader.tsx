import { Tag } from '@/components/ui/Tag';

export function PostHeader({
  type,
  tags,
  title,
  author,
  date,
}: {
  type?: unknown;
  tags?: unknown;
  title: unknown;
  author?: unknown;
  date?: unknown;
}) {
  const typeStr = typeof type === 'string' ? type : undefined;
  const titleStr = typeof title === 'string' ? title : '';
  const authorStr = typeof author === 'string' ? author : undefined;
  const dateStr = typeof date === 'string' ? date : undefined;
  const tagsArr: string[] = Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [];

  return (
    <header className="mb-12">
      {(typeStr === 'original' || typeStr === 'reprint') && (
        <div className="mb-4">
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
            typeStr === 'original'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            {typeStr === 'original' ? '原创' : '转载'}
          </span>
        </div>
      )}
      {tagsArr.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {tagsArr.map((tag) => (
            <Tag key={tag} variant="dark" size="md">
              {tag}
            </Tag>
          ))}
        </div>
      )}
      <h1 className="text-4xl md:text-[3.5rem] font-black tracking-tight text-zinc-900 mb-8 leading-[1.1]">
        {titleStr}
      </h1>
      {(authorStr !== undefined || dateStr !== undefined) && (
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {authorStr && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-zinc-500">{authorStr.charAt(0)}</span>
              </div>
              <span className="font-semibold text-zinc-700">{authorStr}</span>
            </div>
          )}
          {dateStr && (
            <time className="text-zinc-400">
              {new Date(dateStr).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          )}
        </div>
      )}
    </header>
  );
}
