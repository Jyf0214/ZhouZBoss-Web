import { getContentFiles, getContentIndexes } from '@/lib/content';
import { loadConfig } from '@/lib/config';
import { estimateReadingTime } from '@/lib/reading-time';
import { HomePostGrid } from '@/components/HomePostGrid';
import Footer from '@/components/Footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Originium Kernel',
  description: '现代内容发布平台',
};

export const revalidate = 300; // 5 分钟 ISR

/**
 * 首页 — 服务端组件，直接从文件系统读取帖子索引
 * 仅展示 public 内容，不查数据库
 */
export default function HomePage() {
  const config = loadConfig();
  const allFiles = getContentFiles('posts');
  const indexes = getContentIndexes('posts');

  // 仅展示 public 的帖子（首页不显示 private 内容）
  const publicPosts = allFiles.filter((file) => {
    const dirSlug = '/' + file.slug.split('/').filter(Boolean).slice(0, -1).join('/');
    // 检查目录是否标记为 public
    const dirIndex = indexes.find((idx) => idx.slug === dirSlug || (dirSlug === '/' && idx.slug === '/'));
    const isPublic = dirIndex ? dirIndex.public : true;
    return isPublic;
  });

  const posts = publicPosts.map((f) => ({
    slug: f.slug,
    title: f.meta.title,
    date: f.meta.date,
    author: f.meta.author,
    tags: f.meta.tags ?? [],
    cover: f.meta.cover,
    description: f.meta.description,
    pinned: f.meta.pinned === true,
    readingTime: f.content ? estimateReadingTime(f.content) : undefined,
  }));

  // 哀悼日检测
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}-${today.getDate()}`;
  const isMournDay = config.mourn?.enable && config.mourn.days?.includes(dateStr);

  return (
    <div className={`min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-900 ${isMournDay ? 'mourn-mode' : ''}`}
      style={isMournDay ? { filter: 'grayscale(1)' } : undefined}>
      <HomePostGrid
        posts={posts}
        heroTitleLine1={config.site.heroTitleLine1}
        heroTitleLine2={config.site.heroTitleLine2}
        defaultCover={config.cover?.defaultCover?.[0]}
        coverConfig={config.cover}
      />
      <Footer />
    </div>
  );
}
