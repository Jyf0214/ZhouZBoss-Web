// Footer 静态配置 + 默认值兜底 + 远程配置加载 hook
// 与 UI 渲染解耦，方便单元测试和复用。

'use client';

import { useEffect, useState } from 'react';
import {
  Github,
  Twitter,
  Globe,
  Mail,
  type LucideIcon,
} from 'lucide-react';

import type {
  FooterBadge,
  FooterConfigData,
  FooterLinkGroup,
  FooterSocialEntry,
  FooterSocialLink,
} from './types';

// ─── Icon Mapping ────────────────────────────────────
// 将配置中的 icon 名称映射为 lucide-react 组件

export const FOOTER_ICON_MAP: Record<string, LucideIcon> = {
  Github,
  GitHub: Github,
  Twitter,
  Weibo: Globe,
  Email: Mail,
  Mail,
  Globe,
};

/** 根据名称解析图标，缺失时回退到 Globe */
export function resolveFooterIcon(name: string): LucideIcon {
  return FOOTER_ICON_MAP[name] ?? Globe;
}

// ─── Default Data（配置为空时的兜底） ───────────────

export const DEFAULT_FOOTER_LINKS: FooterLinkGroup[] = [
  {
    group: '服务',
    items: [
      { name: '关于我们', url: '/about' },
      { name: '隐私政策', url: '/about' },
      { name: '服务条款', url: '/about' },
    ],
  },
  {
    group: '社交',
    items: [
      { name: 'GitHub', url: 'https://github.com/Jyf0214' },
      { name: 'Twitter', url: '#' },
      { name: '微博', url: '#' },
    ],
  },
  {
    group: '导航',
    items: [
      { name: '首页', url: '/' },
      { name: '文章', url: '/posts' },
      { name: '日记', url: '/diary' },
      { name: '通讯录', url: '/faces' },
    ],
  },
  {
    group: '协议',
    items: [
      { name: 'CC BY-NC-SA 4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/' },
    ],
  },
];

export const DEFAULT_FOOTER_BADGES: FooterBadge[] = [
  { name: 'Next.js', url: 'https://nextjs.org/' },
  { name: 'Prisma', url: 'https://www.prisma.io/' },
  { name: 'Tailwind CSS', url: 'https://tailwindcss.com/' },
  { name: 'TypeScript', url: 'https://www.typescriptlang.org/' },
];

export const DEFAULT_FOOTER_TYPED_TEXTS = ['Next.js 驱动', 'TypeScript 构建', '用心守护'];

// ─── Social Entries 解析 ────────────────────────────
// 合并 socialLinks 配置和 socialData 字典为统一的有序条目

export function buildSocialEntries(
  socialData: Record<string, string>,
  socialLinksConfig?: FooterSocialLink[],
): FooterSocialEntry[] {
  if (socialLinksConfig && socialLinksConfig.length > 0) {
    return socialLinksConfig
      .map((sl) => ({ sl, url: socialData[sl.name] }))
      // 过滤掉 socialData 中缺失的链接，类型守卫同时收窄 url
      .filter((entry): entry is { sl: FooterSocialLink; url: string } => Boolean(entry.url))
      .map(({ sl, url }) => ({ name: sl.name, url, icon: sl.icon }));
  }
  return Object.entries(socialData)
    .filter(([, url]) => Boolean(url))
    .map(([name, url]) => ({ name, url, icon: name }));
}

// ─── Default Value Helpers ───────────────────────────
// 每个 helper 只解析一个默认值，复杂度 ≤ 3

export function defSocialData(socialData: Record<string, string> | null): Record<string, string> {
  return socialData ?? {};
}

export function defAvatarUrl(config: FooterConfigData | null): string | undefined {
  return config?.avatar;
}

export function defSocialLinksConfig(config: FooterConfigData | null): FooterSocialLink[] | undefined {
  return config?.socialLinks;
}

export function defLinks(config: FooterConfigData | null): FooterLinkGroup[] {
  return config?.links && config.links.length > 0 ? config.links : DEFAULT_FOOTER_LINKS;
}

export function defBadges(config: FooterConfigData | null): FooterBadge[] {
  return config?.badges && config.badges.length > 0 ? config.badges : DEFAULT_FOOTER_BADGES;
}

export function defTypedText(config: FooterConfigData | null): string[] {
  return config?.typedText && config.typedText.length > 0 ? config.typedText : DEFAULT_FOOTER_TYPED_TEXTS;
}

export function defTypedTextPrefix(config: FooterConfigData | null): string {
  return config?.typedTextPrefix ?? '本站由 ';
}

export function defOwner(config: FooterConfigData | null): FooterConfigData['owner'] {
  return config?.owner ?? { enable: true, since: 2020 };
}

export function defAuthor(config: FooterConfigData | null): string {
  return config?.owner?.author ?? 'Originium Kernel';
}

export function defCustomText(config: FooterConfigData | null): string {
  return config?.customText ?? '';
}

export function defRuntimeEnable(config: FooterConfigData | null): boolean {
  return config?.runtime?.enable ?? false;
}

export function defLaunchTime(config: FooterConfigData | null): string {
  return config?.runtime?.launchTime ?? '';
}

// ─── Config Hook ─────────────────────────────────────
// 从 /api/config 拉取 footer 与 social 字段，失败时记录错误但不抛出。

export interface UseFooterConfigResult {
  config: FooterConfigData | null;
  socialData: Record<string, string> | null;
  error: string | null;
}

export function useFooterConfig(): UseFooterConfigResult {
  const [config, setConfig] = useState<FooterConfigData | null>(null);
  const [socialData, setSocialData] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          if (data.footer) setConfig(data.footer);
          if (data.social) setSocialData(data.social);
        } else {
          const errMsg = `页脚配置获取失败: ${res.status}`;
          console.warn(errMsg);
          setError(errMsg);
        }
      } catch (e) {
        const errMsg = '页脚配置请求异常';
        console.warn(errMsg, e);
        setError(errMsg);
      }
    };
    void fetchConfig();
  }, []);

  return { config, socialData, error };
}
