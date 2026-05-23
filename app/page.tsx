import { getContentFiles, getContentIndexes } from '@/lib/content';
import { loadConfig, hasDatabase, canAccess } from '@/lib/config';
import { Navbar } from '@/components/Navbar';
import { HomePostGrid } from './HomePostGrid';
import { getSession } from '@/lib/auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Originium Kernel',
  description: '现代内容发布平台',
};

/**
 * 首页 — 服务端组件，直接从文件系统读取帖子索引
 * 仅展示 public 内容，不查数据库
 */
export default async function HomePage() {
  const config = loadConfig();
  const allFiles = getContentFiles('posts');
  const indexes = getContentIndexes('posts');
  const session = await getSession();
  const isAdmin = session?.role === 'admin' || session?.role === 'sudo';

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
  }));

  // facesCount - 游客无法看到通讯录
  const facesCount = (() => {
    try {
      const faceFiles = getContentFiles('faces');
      const dbAvailable = hasDatabase();
      const publicFaces = faceFiles.filter(file => {
        if (isAdmin) return true;
        const dirSlug = '/' + file.slug.split('/').filter(Boolean).slice(0, -1).join('/');
        
        return canAccess('faces', file.slug, false, dbAvailable, config) &&
               canAccess('faces', dirSlug ?? '/', false, dbAvailable, config) &&
               file.meta.public === true;
      });
      return publicFaces.length;
    } catch {
      return 0;
    }
  })();

  // 仅管理员可以看到 facesCount
  const displayFacesCount = isAdmin ? facesCount : 0;

  // 哀悼日检测
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}-${today.getDate()}`;
  const isMournDay = config.mourn?.enable && config.mourn.days?.includes(dateStr);

  return (
    <div className={`min-h-screen flex flex-col bg-zinc-50 ${isMournDay ? 'mourn-mode' : ''}`}
      style={isMournDay ? { filter: 'grayscale(1)' } : undefined}>
      <Navbar />
      <HomePostGrid
        posts={posts}
        postCount={posts.length}
        facesCount={displayFacesCount}
        isAdmin={isAdmin}
        heroTitleLine1={config.site.heroTitleLine1}
        heroTitleLine2={config.site.heroTitleLine2}
      />
    </div>
  );
}
