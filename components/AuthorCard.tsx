'use client';

import { useConfig } from '@/hooks/use-config';
import { Avatar } from '@/components/Avatar';
import { Tag } from '@/components/ui/Tag';

interface AuthorCardProps {
  authorName: string;
  authorAvatar?: string;
  authorUrl?: string;
}

export default function AuthorCard({ authorName, authorAvatar, authorUrl }: AuthorCardProps) {
  const { config } = useConfig();
  const cfg = config?.authorStatus;

  if (!cfg?.enable) return null;

  return (
    <div className="max-w-3xl mx-auto mt-12 pt-8 border-t border-zinc-100">
      <div className="bg-zinc-50 rounded-2xl p-6 flex items-start gap-4">
        <a
          href={authorUrl ?? '/'}
          className="shrink-0"
        >
          <Avatar name={authorName} avatarUrl={authorAvatar} size={56} />
        </a>
        <div className="min-w-0 flex-1">
          <a
            href={authorUrl ?? '/'}
            className="font-black text-zinc-900 hover:text-zinc-600 transition-colors"
          >
            {authorName}
          </a>
          {cfg.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {cfg.skills.map((skill, i) => (
                <Tag key={i} variant="outline" size="sm">{skill}</Tag>
              ))}
            </div>
          )}
          {cfg.statusImg && (
            <div className="mt-3">
              <img
                src={cfg.statusImg}
                alt="status"
                className="max-h-6 object-contain"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
