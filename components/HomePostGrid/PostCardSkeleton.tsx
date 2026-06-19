import { Skeleton } from '@/components/ui/Skeleton';

/**
 * 模拟 PostCard 布局的骨架屏，用于首页文章列表加载态
 */
export function PostCardSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border-2 border-zinc-50 dark:border-zinc-800 overflow-hidden shadow-sm">
      {/* 图片区域 */}
      <Skeleton className="w-full aspect-video rounded-none" />
      {/* 内容区域 */}
      <div className="px-5 py-4 flex flex-col gap-3">
        {/* 标签占位 */}
        <div className="flex gap-1.5 mb-1">
          <Skeleton className="w-12 h-5 rounded-full" />
          <Skeleton className="w-16 h-5 rounded-full" />
        </div>
        {/* 标题 — 2 行 */}
        <Skeleton className="w-4/5 h-5" />
        <Skeleton className="w-3/5 h-5" />
        {/* 描述 — 1 行 */}
        <Skeleton className="w-full h-4 mt-1" />
        {/* 底部元信息 */}
        <div className="mt-3 pt-3 border-t border-zinc-50 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="w-16 h-3" />
          </div>
          <Skeleton className="w-20 h-3" />
        </div>
      </div>
    </div>
  );
}
