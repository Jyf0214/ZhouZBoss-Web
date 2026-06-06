import { getContentFiles, getContentIndexes } from '@/lib/content';
import { Navbar } from '@/components/Navbar';
import { PageContainer } from '@/components/ui/PageContainer';
import { Tag } from '@/components/ui/Tag';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '归档 Archives',
  description: '按年份浏览所有公开文章',
};

interface YearGroup {
  year: number;
  posts: {
    slug: string;
    title: string;
    date: string;
    tags: string[];
  }[];
}

export default function ArchivesPage() {
  const allFiles = getContentFiles('posts');
  const indexes = getContentIndexes('posts');

  // 仅展示 public 的帖子
  const publicFiles = allFiles.filter((file) => {
    const dirSlug = '/' + file.slug.split('/').filter(Boolean).slice(0, -1).join('/');
    const dirIndex = indexes.find(
      (idx) => idx.slug === dirSlug || (dirSlug === '/' && idx.slug === '/'),
    );
    return dirIndex ? dirIndex.public : true;
  });

  // 提取 posts，只保留有日期的
  const posts = publicFiles
    .map((f) => ({
      slug: f.slug,
      title: f.meta.title,
      date: f.meta.date ?? '',
      tags: f.meta.tags ?? [],
    }))
    .filter((p) => p.date !== '');

  // 按年份分组
  const groups: YearGroup[] = [];
  const yearMap = new Map<number, YearGroup['posts']>();

  for (const post of posts) {
    const year = new Date(post.date).getFullYear();
    if (isNaN(year)) continue;
    if (!yearMap.has(year)) {
      yearMap.set(year, []);
    }
    yearMap.get(year)!.push(post);
  }

  for (const [year, yearPosts] of yearMap.entries()) {
    // 年份内按日期降序排列
    yearPosts.sort((a, b) => {
      if (a.date < b.date) return 1;
      if (a.date > b.date) return -1;
      return 0;
    });
    groups.push({ year, posts: yearPosts });
  }

  // 年份降序排列
  groups.sort((a, b) => b.year - a.year);

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <Navbar />
      <PageContainer maxWidth="4xl" padding="wide">
        <h1 className="text-4xl md:text-5xl font-display font-black tracking-tighter text-zinc-900 mb-2">
          归档 Archives
        </h1>
        <p className="text-zinc-400 text-base mb-12">
          共 {posts.length} 篇文章
        </p>

        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.year}>
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="text-2xl font-bold text-zinc-900">
                  {group.year}
                </h2>
                <span className="text-sm text-zinc-400">
                  {group.posts.length} 篇
                </span>
              </div>

              <div className="space-y-2">
                {group.posts.map((post) => (
                  <article
                    key={post.slug}
                    className="flex items-center gap-4 py-2 border-b border-zinc-100 last:border-b-0"
                  >
                    <time className="text-sm text-zinc-400 font-mono shrink-0 w-10">
                      {formatShortDate(post.date)}
                    </time>
                    <Link
                      href={post.slug}
                      className="text-zinc-800 hover:text-zinc-600 transition-colors font-medium truncate"
                    >
                      {post.title}
                    </Link>
                    {post.tags.length > 0 && (
                      <div className="flex gap-1.5 ml-auto shrink-0">
                        {post.tags.map((tag) => (
                          <Tag key={tag} variant="light" size="sm">
                            {tag}
                          </Tag>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}

          {groups.length === 0 && (
            <p className="text-zinc-400 text-center py-16">
              暂无归档内容
            </p>
          )}
        </div>
      </PageContainer>
    </div>
  );
}
