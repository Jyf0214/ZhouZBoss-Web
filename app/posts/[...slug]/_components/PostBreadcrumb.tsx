import Link from 'next/link';

interface Crumb {
  label: string;
  href: string;
  isLast: boolean;
}

export type { Crumb };

export function PostBreadcrumb({ crumbs, t }: { slug: string; crumbs: Crumb[]; t: (key: string) => string }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-zinc-400 mb-10 flex-wrap">
      <Link href="/posts" className="hover:text-zinc-900 transition-colors font-medium text-zinc-500">
        {t('title')}
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          <span className="text-zinc-300">/</span>
          {crumb.isLast ? (
            <span className="text-zinc-900 font-semibold max-w-[200px] truncate">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-zinc-900 transition-colors font-medium">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
