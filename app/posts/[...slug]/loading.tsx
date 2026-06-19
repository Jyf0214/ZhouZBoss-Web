import { PostDetailSkeleton } from './_components/PostDetailSkeleton';

/**
 * 文章详情页路由加载态骨架屏 — 在文章内容加载时显示
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 pt-8 pb-16">
        <div className="lg:flex lg:gap-12">
          <PostDetailSkeleton />
        </div>
      </main>
    </div>
  );
}
