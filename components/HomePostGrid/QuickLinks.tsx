import Link from 'next/link';
import { BookOpen, Users, ArrowRight } from 'lucide-react';

export function QuickLinks({
  postCount,
  facesCount,
  isAdmin,
  t,
}: {
  postCount: number;
  facesCount: number;
  isAdmin: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <section className="mb-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/posts" className="group">
          <div className="bg-white rounded-3xl border border-zinc-100 p-8 hover:border-zinc-300 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-colors duration-300">
                <BookOpen size={24} className="text-zinc-400 group-hover:text-white transition-colors" />
              </div>
              <ArrowRight size={20} className="text-zinc-300 group-hover:text-zinc-900 group-hover:translate-x-1 transition-all" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mb-1">{t('nav.posts')}</h2>
            <p className="text-zinc-400 text-sm">
              {t('home.postsDesc', { count: postCount })}
            </p>
          </div>
        </Link>
        {isAdmin && (
          <Link href="/faces" className="group">
            <div className="bg-white rounded-3xl border border-zinc-100 p-8 hover:border-zinc-300 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-colors duration-300">
                  <Users size={24} className="text-zinc-400 group-hover:text-white transition-colors" />
                </div>
                <ArrowRight size={20} className="text-zinc-300 group-hover:text-zinc-900 group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 mb-1">{t('nav.faces')}</h2>
              <p className="text-zinc-400 text-sm">
                {t('home.facesDesc', { count: facesCount })}
              </p>
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}
