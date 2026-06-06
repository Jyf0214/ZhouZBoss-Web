import { getContentIndexes, getContentFiles } from '@/lib/content';

export interface RelatedPost {
  slug: string;
  title: string;
  date?: string;
  sharedTags: number;
}

export function getRelatedPosts(currentSlug: string, currentTags: string[] = [], limit = 4): RelatedPost[] {
  const pubIndexes = getContentIndexes('posts');
  const allPublicFiles = getContentFiles('posts').filter((f) => {
    const dirSlug = '/' + f.slug.split('/').filter(Boolean).slice(0, -1).join('/');
    const dirIndex = pubIndexes.find(
      (idx) => idx.slug === dirSlug || (dirSlug === '/' && idx.slug === '/'),
    );
    return dirIndex ? dirIndex.public : true;
  });

  return allPublicFiles
    .filter((f) => f.slug !== currentSlug)
    .map((f) => ({
      slug: f.slug,
      title: f.meta.title,
      date: f.meta.date,
      sharedTags: (f.meta.tags ?? []).filter((t) => currentTags.includes(t)).length,
    }))
    .filter((f) => f.sharedTags > 0)
    .sort((a, b) => b.sharedTags - a.sharedTags)
    .slice(0, limit);
}
