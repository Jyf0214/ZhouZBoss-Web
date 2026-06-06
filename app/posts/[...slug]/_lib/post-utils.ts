import { getContentIndexes } from '@/lib/content';

export function isPrivateSlug(slug: string): boolean {
  const indexes = getContentIndexes('posts');
  const dirSlug = '/' + slug.split('/').filter(Boolean).slice(0, -1).join('/');
  const dirIndex = indexes.find((idx) => idx.slug === dirSlug || (dirSlug === '/' && idx.slug === '/'));
  return dirIndex ? !dirIndex.public : false;
}

const I18N_MAP: Record<string, string> = {
  title: '帖子',
  backToPosts: '返回帖子列表',
};

export function tPosts(key: string): string {
  return I18N_MAP[key] ?? key;
}
