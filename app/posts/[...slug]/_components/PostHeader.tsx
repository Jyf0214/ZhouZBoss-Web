import { Calendar, User } from 'lucide-react';
import { Tag } from '@/components/ui/Tag';

interface PostHeaderProps {
  type?: unknown;
  tags?: unknown;
  title: unknown;
  author?: unknown;
  date?: unknown;
  cover?: unknown;
}

function CoverHero({
  titleStr,
  authorStr,
  dateStr,
  typeStr,
  tagsArr,
  coverStr,
}: {
  titleStr: string;
  authorStr?: string;
  dateStr?: string;
  typeStr?: string;
  tagsArr: string[];
  coverStr: string;
}) {
  return (
    <header className="relative -mx-6 sm:-mx-8 mb-12 rounded-2xl sm:rounded-3xl overflow-hidden">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105 blur-sm"
          style={{ backgroundImage: `url(${coverStr})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
      </div>
      <div className="relative z-10 flex flex-col justify-end min-h-[320px] sm:min-h-[400px] p-8 sm:p-10">
        {typeStr && (
          <div className="mb-4">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm ${
              typeStr === 'original'
                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                : 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
            }`}>
              {typeStr === 'original' ? '原创' : '转载'}
            </span>
          </div>
        )}
        {tagsArr.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tagsArr.map((tag) => (
              <span key={tag} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/15 backdrop-blur-sm text-white/80 border border-white/10">
                {tag}
              </span>
            ))}
          </div>
        )}
        <h1 className="text-3xl sm:text-4xl md:text-[3.5rem] font-black tracking-tight text-white mb-6 leading-[1.1] drop-shadow-lg">
          {titleStr}
        </h1>
        {(authorStr ?? dateStr) && (
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
            {authorStr && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <User size={14} className="text-white/80" />
                </div>
                <span className="font-medium text-white/90">{authorStr}</span>
              </div>
            )}
            {dateStr && (
              <time className="flex items-center gap-1.5">
                <Calendar size={13} />
                {new Date(dateStr).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function SimpleHeader({
  titleStr,
  authorStr,
  dateStr,
  typeStr,
  tagsArr,
}: {
  titleStr: string;
  authorStr?: string;
  dateStr?: string;
  typeStr?: string;
  tagsArr: string[];
}) {
  return (
    <header className="mb-12">
      {typeStr && (
        <div className="mb-4">
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
            typeStr === 'original'
              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700'
              : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700'
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
      <h1 className="text-4xl md:text-[3.5rem] font-black tracking-tight text-zinc-900 dark:text-zinc-100 mb-8 leading-[1.1]">
        {titleStr}
      </h1>
      {(authorStr ?? dateStr) && (
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {authorStr && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-700 rounded-full flex items-center justify-center">
                <User size={14} className="text-zinc-500 dark:text-zinc-400" />
              </div>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{authorStr}</span>
            </div>
          )}
          {dateStr && (
            <time className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
              <Calendar size={13} />
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

export function PostHeader({ type, tags, title, author, date, cover }: PostHeaderProps) {
  const typeStr = typeof type === 'string' && (type === 'original' || type === 'reprint') ? type : undefined;
  const titleStr = typeof title === 'string' ? title : '';
  const authorStr = typeof author === 'string' ? author : undefined;
  const dateStr = typeof date === 'string' ? date : undefined;
  const coverStr = typeof cover === 'string' ? cover : undefined;
  const tagsArr: string[] = Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [];

  if (coverStr) {
    return <CoverHero titleStr={titleStr} authorStr={authorStr} dateStr={dateStr} typeStr={typeStr} tagsArr={tagsArr} coverStr={coverStr} />;
  }

  return <SimpleHeader titleStr={titleStr} authorStr={authorStr} dateStr={dateStr} typeStr={typeStr} tagsArr={tagsArr} />;
}
