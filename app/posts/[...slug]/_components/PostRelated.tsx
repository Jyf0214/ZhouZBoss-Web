import Link from 'next/link';
import type { RelatedPost } from '../_lib/related-posts';

export function PostRelated({ posts }: { posts: RelatedPost[] }) {
  if (posts.length === 0) return null;
  return (
    <div className="mt-12">
      <h2 className="text-lg font-bold text-zinc-900 mb-6">相关文章</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={post.slug}
            className="group p-4 rounded-xl bg-zinc-50 border border-zinc-100 hover:bg-zinc-100 transition-colors"
          >
            <h3 className="text-sm font-semibold text-zinc-700 group-hover:text-zinc-900 transition-colors line-clamp-2 mb-2">
              {post.title}
            </h3>
            {post.date && (
              <time className="text-xs text-zinc-400">
                {new Date(post.date).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
