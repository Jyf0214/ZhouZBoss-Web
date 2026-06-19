import { PostCardSkeleton } from '@/components/HomePostGrid/PostCardSkeleton';

/**
 * 首页路由加载态骨架屏 — 在文章数据加载前显示 4 个骨架卡片
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-900">
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 md:py-20">
        {/* Hero 区域占位 */}
        <div className="mb-12 text-center">
          <div className="h-10 w-64 mx-auto bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mb-4" />
          <div className="h-10 w-48 mx-auto bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
        </div>

        {/* 标题 + 分类栏占位 */}
        <div className="flex items-center justify-between mb-8">
          <div className="h-8 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
          <div className="h-5 w-20 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
        </div>

        {/* 4 个骨架卡片 — 匹配 PostCard 网格布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
