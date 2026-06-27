'use client';

import { Hash } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function GroupTabs({
  groupNames,
  groupSlugMap,
  activeGroup,
  onSelect,
  t,
}: {
  groupNames: string[];
  groupSlugMap: Map<string, string>;
  activeGroup: string | null;
  onSelect: (slug: string | null) => void;
  t: (key: string) => string;
}) {
  if (groupNames.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-8">
      <Button
        onClick={() => onSelect(null)}
        variant={activeGroup === null ? 'primary' : 'ghost'}
        size="sm"
        autoLoading={false}
        className={activeGroup === null ? 'shadow-lg shadow-zinc-900/20' : ''}
      >
        {t('posts.allPosts')}
      </Button>
      {groupNames.map((name) => {
        const slug = groupSlugMap.get(name)!;
        return (
          <Button
            key={name}
            onClick={() => onSelect(slug)}
            variant={activeGroup === slug ? 'primary' : 'ghost'}
            size="sm"
            autoLoading={false}
            className={activeGroup === slug ? 'shadow-lg shadow-zinc-900/20' : ''}
            icon={<Hash size={14} className="opacity-50" />}
          >
            {name}
          </Button>
        );
      })}
    </div>
  );
}
