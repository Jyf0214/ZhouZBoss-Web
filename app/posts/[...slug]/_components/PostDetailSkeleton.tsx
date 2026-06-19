import { Skeleton } from '@/components/ui/Skeleton';

/**
 * 文章详情页骨架屏，在文章内容加载时显示
 */
export function PostDetailSkeleton() {
  return (
    <div className="flex-1 min-w-0 max-w-3xl">
      {/* 面包屑占位 */}
      <div className="flex items-center gap-2 mb-8">
        <Skeleton className="w-12 h-4" />
        <Skeleton className="w-4 h-4 rounded-full" />
        <Skeleton className="w-20 h-4" />
        <Skeleton className="w-4 h-4 rounded-full" />
        <Skeleton className="w-32 h-4" />
      </div>

      <article>
        <header className="mb-12">
          {/* 类型标签占位 */}
          <div className="mb-4">
            <Skeleton className="w-14 h-5 rounded-lg" />
          </div>
          {/* 标签占位 */}
          <div className="flex gap-2 mb-5">
            <Skeleton className="w-14 h-6 rounded-full" />
            <Skeleton className="w-20 h-6 rounded-full" />
            <Skeleton className="w-10 h-6 rounded-full" />
          </div>
          {/* 标题占位 — 大标题 3 行 */}
          <Skeleton className="w-4/5 h-10 mb-3" />
          <Skeleton className="w-3/5 h-10 mb-8" />
          {/* 作者与日期占位 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="w-20 h-4" />
            </div>
            <Skeleton className="w-28 h-4" />
          </div>
        </header>

        {/* 分隔线占位 */}
        <div className="h-px bg-zinc-100 mb-12" />

        {/* 正文内容占位 — 多行模拟 */}
        <div className="flex flex-col gap-4">
          <Skeleton className="w-2/3 h-5" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-5/6 h-4" />
          <Skeleton className="w-full h-4 mt-4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-4/5 h-4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-3/4 h-4 mt-4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-5/6 h-4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-2/3 h-4" />
          <Skeleton className="w-full h-4 mt-4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-4/5 h-4" />
        </div>
      </article>

      {/* 侧边栏占位（TOC） */}
      <div className="hidden lg:block fixed right-8 top-32 w-48">
        <div className="flex flex-col gap-3">
          <Skeleton className="w-20 h-4" />
          <Skeleton className="w-32 h-3" />
          <Skeleton className="w-28 h-3" />
          <Skeleton className="w-36 h-3" />
          <Skeleton className="w-24 h-3" />
        </div>
      </div>
    </div>
  );
}
