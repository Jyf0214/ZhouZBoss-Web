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
    const isPublic = dirIndex ? dirIndex.public !== false : true;
    return isPublic;
  });

  const posts = publicPosts.map((f) => ({
    slug: f.slug,
    title: f.meta.title,
    date: f.meta.date,
    author: f.meta.author,
    tags: f.meta.tags || [],
    cover: f.meta.cover,
    description: f.meta.description,
  }));

  // facesCount
  const facesCount = (() => {
    try {
      const faceFiles = getContentFiles('faces');
      const dbAvailable = hasDatabase();
      const publicFaces = faceFiles.filter(file => {
        if (isAdmin) return true;
        const dirSlug = '/' + file.slug.split('/').filter(Boolean).slice(0, -1).join('/');
        
        return canAccess('faces', file.slug, false, dbAvailable, config) &&
               canAccess('faces', dirSlug || '/', false, dbAvailable, config) &&
               file.meta.public === true;
      });
      return publicFaces.length;
    } catch {
      return 0;
    }
  })();

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f8f8]">
      <Navbar />
      <HomePostGrid 
        posts={posts} 
        postCount={posts.length} 
        facesCount={facesCount} 
        heroTitleLine1={config.site.heroTitleLine1}
        heroTitleLine2={config.site.heroTitleLine2}
      />
    </div>
  );
}
