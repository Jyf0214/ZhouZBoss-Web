import { useMemo, useState } from 'react';
import type { PostItem, GroupItem } from './types';

export function usePostFilter(posts: PostItem[], groups: GroupItem[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const groupSlugMap = useMemo(() => {
    const m = new Map<string, string>();
    groups.forEach((g) => {
      if (g.groupName) m.set(g.groupName, g.slug);
    });
    return m;
  }, [groups]);

  const groupNames = useMemo(() => Array.from(groupSlugMap.keys()), [groupSlugMap]);

  const filteredPosts = useMemo(() => posts.filter((p) => {
    const matchesSearch = !searchTerm ||
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesGroup = !activeGroup ||
      p.slug.startsWith(activeGroup === '/' ? '/' : activeGroup + '/');
    return matchesSearch && matchesGroup;
  }), [posts, searchTerm, activeGroup]);

  return {
    searchTerm,
    setSearchTerm,
    activeGroup,
    setActiveGroup,
    filteredPosts,
    groupNames,
    groupSlugMap,
  };
}
