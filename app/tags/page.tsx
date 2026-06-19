import { getContentFiles, getContentIndexes } from '@/lib/content';
import Link from 'next/link';
import { Hash, ArrowLeft } from 'lucide-react';
import { Tag } from '@/components/ui/Tag';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '标签管理 - Originium Kernel',
  description: '浏览所有标签及关联文章数量',
};

export const revalidate = 300; // 5 分钟 ISR

/**
 * 计算标签云的字号和颜色
 * 字号从 text-xs 到 text-2xl 按数量线性缩放
 */
function getTagStyle(count: number, maxCount: number, minCount: number): {
  fontSize: string;
  variant: 'light' | 'outline' | 'dark';
} {
  if (maxCount === minCount) {
    return { fontSize: '1.25rem', variant: 'dark' };
  }

  // 线性插值：text-xs (0.75rem) 到 text-2xl (1.5rem)
  const ratio = (count - minCount) / (maxCount - minCount);
  const sizeRem = 0.75 + ratio * 0.75; // 0.75rem ~ 1.5rem
  const fontSize = `${sizeRem}rem`;

  // 颜色深浅映射数量
  let variant: 'light' | 'outline' | 'dark';
  if (ratio > 0.66) {
    variant = 'dark';
  } else if (ratio > 0.33) {
    variant = 'outline';
  } else {
    variant = 'light';
  }

  return { fontSize, variant };
}

export default function TagsPage() {
  const allFiles = getContentFiles('posts');
  const indexes = getContentIndexes('posts');

  // 仅统计公开文章的标签
  const publicFiles = allFiles.filter((file) => {
    const dirSlug = '/' + file.slug.split('/').filter(Boolean).slice(0, -1).join('/');
    const dirIndex = indexes.find(
      (idx) => idx.slug === dirSlug || (dirSlug === '/' && idx.slug === '/'),
    );
    return dirIndex ? dirIndex.public : true;
  });

  // 聚合标签及文章数量
  const tagMap = new Map<string, number>();
  for (const file of publicFiles) {
    for (const tag of file.meta.tags ?? []) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }
  }

  const tags = Array.from(tagMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const counts = tags.map((t) => t.count);
  const maxCount = counts.length > 0 ? Math.max(...counts) : 1;
  const minCount = counts.length > 0 ? Math.min(...counts) : 1;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 md:py-20">
        {/* 返回链接 */}
        <Link
          href="/posts"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-900 transition-colors mb-8"
        >
          <ArrowLeft size={14} />
          <span>所有帖子</span>
        </Link>

        {/* 页面头部 */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-zinc-900 rounded-2xl flex items-center justify-center">
            <Hash size={20} className="text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-zinc-900">
            标签
          </h1>
        </div>
        <p className="text-zinc-400 text-lg mb-12">
          共 {tags.length} 个标签，{publicFiles.length} 篇帖子
        </p>

        {/* 标签云 */}
        {tags.length > 0 ? (
          <div className="bg-white rounded-3xl border border-zinc-100 p-8 md:p-12">
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
              {tags.map(({ name, count }) => {
                const style = getTagStyle(count, maxCount, minCount);
                return (
                  <Link
                    key={name}
                    href={`/tags/${encodeURIComponent(name)}`}
                    className="inline-flex items-center gap-1.5 hover:scale-105 transition-transform duration-200"
                  >
                    <Tag variant={style.variant} className={`!px-4 !py-1.5`} style={{ fontSize: style.fontSize }}>
                      {name}
                      <span className="ml-1.5 opacity-50">{count}</span>
                    </Tag>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          /* 空状态 */
          <div className="py-32 text-center">
            <div className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Hash size={32} className="text-zinc-300" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">暂无标签</h3>
            <p className="text-zinc-400 text-sm max-w-md mx-auto">
              给文章添加标签后，它们会出现在这里
            </p>
          </div>
        )}

        {/* 标签列表视图 */}
        {tags.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">
              标签列表
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tags.map(({ name, count }) => (
                <Link
                  key={name}
                  href={`/tags/${encodeURIComponent(name)}`}
                  className="group flex items-center justify-between bg-white rounded-2xl border border-zinc-100 px-5 py-3.5 hover:border-zinc-300 hover:shadow-lg hover:shadow-zinc-100/50 transition-all duration-300"
                >
                  <div className="flex items-center gap-2.5">
                    <Hash size={14} className="text-zinc-300 group-hover:text-zinc-600 transition-colors" />
                    <span className="font-medium text-zinc-900 group-hover:text-zinc-600 transition-colors">
                      {name}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-zinc-400 bg-zinc-50 group-hover:bg-zinc-100 px-2.5 py-0.5 rounded-full transition-colors">
                    {count}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 底部导航 */}
        <div className="mt-16 pt-8 border-t border-zinc-100">
          <Link
            href="/posts"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            返回帖子列表
          </Link>
        </div>
      </main>
    </div>
  );
}
