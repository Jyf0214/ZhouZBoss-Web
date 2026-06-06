'use client';

import { AnimatePresence } from 'motion/react';
import { useI18n } from '@/hooks/use-i18n';
import { PostListHeader } from './PostListHeader';
import { GroupTabs } from './GroupTabs';
import { PostListItem } from './PostListItem';
import { PostListEmptyState } from './PostListEmptyState';
import { usePostFilter } from './use-post-filter';
import type { PostListClientProps } from './types';

export type { PostItem, GroupItem, CoverConfig, PostListClientProps } from './types';

export function PostListClient({ posts, groups, coverConfig }: PostListClientProps) {
  const { t, locale } = useI18n();
  const {
    searchTerm,
    setSearchTerm,
    activeGroup,
    setActiveGroup,
    filteredPosts,
    groupNames,
    groupSlugMap,
  } = usePostFilter(posts, groups);

  return (
    <div>
      <PostListHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        postCount={filteredPosts.length}
        t={t}
      />

      <GroupTabs
        groupNames={groupNames}
        groupSlugMap={groupSlugMap}
        activeGroup={activeGroup}
        onSelect={setActiveGroup}
        t={t}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredPosts.map((post, index) => (
            <PostListItem
              key={post.slug}
              post={post}
              index={index}
              coverConfig={coverConfig}
              locale={locale}
              t={t}
            />
          ))}
        </AnimatePresence>
      </div>

      {filteredPosts.length === 0 && <PostListEmptyState t={t} />}
    </div>
  );
}

export default PostListClient;
