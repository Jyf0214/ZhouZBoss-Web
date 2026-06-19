// FooterLinks - 链接分组 + 技术栈徽章
// 两者均属于"链接类"内容，集中放在此文件。

'use client';

import React from 'react';

import type { FooterBadge, FooterLinkGroup } from './types';

// ─── Link Groups ─────────────────────────────────────

export interface FooterLinkGroupsProps {
  groups: FooterLinkGroup[];
}

/**
 * 链接分组：在响应式网格中按 group 渲染多列链接。
 */
export function FooterLinkGroups({ groups }: FooterLinkGroupsProps) {
  if (!groups.length) return null;
  return (
    <nav aria-label="友情链接" className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {groups.map((group) => (
        <div key={group.group}>
          <h3 className="font-semibold text-sm text-zinc-500 dark:text-zinc-400 mb-3">{group.group}</h3>
          <ul className="flex flex-col gap-2">
            {group.items.map((item) => (
              <li key={item.name}>
                <a
                  href={item.url}
                  className="text-sm text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors duration-300"
                  {...(item.url.startsWith('http')
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  {item.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// ─── Badges ──────────────────────────────────────────

export interface FooterBadgesProps {
  badges: FooterBadge[];
}

/**
 * 技术栈徽章：一组点击可跳转的胶囊型标签。
 */
export function FooterBadges({ badges }: FooterBadgesProps) {
  if (!badges.length) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2" aria-label="技术栈">
      {badges.map((badge) => (
        <a
          key={badge.name}
          href={badge.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex px-3 py-1 rounded-full bg-zinc-800 text-white text-xs font-mono hover:bg-zinc-700 transition-all duration-300"
        >
          {badge.name}
        </a>
      ))}
    </div>
  );
}

export default FooterLinkGroups;
