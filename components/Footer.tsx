/* eslint-disable max-lines */
'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Github,
  Twitter,
  Globe,
  Mail,
  Heart,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';

// ─── Types ───────────────────────────────────────────

interface FooterOwnerConfig {
  enable: boolean;
  since: number;
  author?: string;
}

interface FooterRuntimeConfig {
  enable: boolean;
  launchTime: string;
}

interface FooterSocialLink {
  name: string;
  icon: string;
}

interface FooterLinkItem {
  name: string;
  url: string;
}

interface FooterLinkGroup {
  group: string;
  items: FooterLinkItem[];
}

interface FooterBadge {
  name: string;
  url: string;
}

interface FooterConfigData {
  owner: FooterOwnerConfig;
  customText: string;
  runtime: FooterRuntimeConfig;
  avatar?: string;
  socialLinks?: FooterSocialLink[];
  links?: FooterLinkGroup[];
  badges?: FooterBadge[];
  typedTextPrefix?: string;
  typedText?: string[];
}

// ─── Icon Mapping ────────────────────────────────────
// Maps config icon names to lucide-react components

const ICON_MAP: Record<string, LucideIcon> = {
  Github,
  GitHub: Github,
  Twitter,
  Weibo: Globe,
  Email: Mail,
  Mail,
  Globe,
};

function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Globe;
}

// ─── Default Data (fallback when config is empty) ────

const DEFAULT_LINKS: FooterLinkGroup[] = [
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

const DEFAULT_BADGES: FooterBadge[] = [
  { name: 'Next.js', url: 'https://nextjs.org/' },
  { name: 'Prisma', url: 'https://www.prisma.io/' },
  { name: 'Tailwind CSS', url: 'https://tailwindcss.com/' },
  { name: 'TypeScript', url: 'https://www.typescriptlang.org/' },
];

const DEFAULT_TYPED_TEXTS = ['Next.js 驱动', 'TypeScript 构建', '用心守护'];

// ─── Sub-components ──────────────────────────────────

/**
 * Social bar with centered avatar and social icon buttons on both sides.
 * Avatar click scrolls to top.
 */
function SocialBar({
  socialData,
  avatarUrl,
  socialLinksConfig,
}: {
  socialData: Record<string, string>;
  avatarUrl?: string;
  socialLinksConfig?: FooterSocialLink[];
}) {
  // Build ordered entries from config or fallback to top-level social data
  const entries = socialLinksConfig && socialLinksConfig.length > 0
    ? socialLinksConfig
        .filter((sl) => socialData[sl.name])
        .map((sl) => ({ name: sl.name, url: socialData[sl.name], icon: sl.icon }))
    : Object.entries(socialData)
        .filter(([, url]) => url)
        .map(([name, url]) => ({ name, url, icon: name }));

  const handleScrollTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const hasContent = entries.length > 0 || avatarUrl;
  if (!hasContent) return null;

  const mid = Math.ceil(entries.length / 2);
  const leftItems = entries.slice(0, mid);
  const rightItems = entries.slice(mid);

  return (
    <div className="flex items-center justify-center">
      {/* Left icons */}
      {leftItems.length > 0 && (
        <div className="flex items-center gap-3">
          {leftItems.map((item) => {
            const Icon = resolveIcon(item.icon);
            return (
              <Button
                key={item.name}
                variant="primary"
                className="w-9 h-9 rounded-full flex items-center justify-center p-0"
                title={item.name}
                onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
              >
                <Icon className="w-4 h-4" />
              </Button>
            );
          })}
        </div>
      )}

      {/* Center avatar / logo */}
      <button
        onClick={handleScrollTop}
        className={`${entries.length > 0 ? 'mx-6' : ''} focus:outline-none`}
        title="回到顶部"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Logo"
            className="w-16 h-16 rounded-full border-2 border-zinc-200 object-cover hover:border-zinc-400 transition-colors duration-300"
          />
        ) : (
          <div className="w-16 h-16 rounded-full border-2 border-zinc-200 bg-zinc-100 flex items-center justify-center text-zinc-400 hover:border-zinc-400 transition-colors duration-300">
            <Globe className="w-6 h-6" />
          </div>
        )}
      </button>

      {/* Right icons */}
      {rightItems.length > 0 && (
        <div className="flex items-center gap-3">
          {rightItems.map((item) => {
            const Icon = resolveIcon(item.icon);
            return (
              <Button
                key={item.name}
                variant="primary"
                className="w-9 h-9 rounded-full flex items-center justify-center p-0"
                title={item.name}
                onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
              >
                <Icon className="w-4 h-4" />
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Link groups displayed in a responsive grid.
 */
function LinkGroups({ groups }: { groups: FooterLinkGroup[] }) {
  if (!groups.length) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {groups.map((group) => (
        <div key={group.group}>
          <h3 className="font-semibold text-sm text-zinc-500 mb-3">{group.group}</h3>
          <ul className="flex flex-col gap-2">
            {group.items.map((item) => (
              <li key={item.name}>
                <a
                  href={item.url}
                  className="text-sm text-zinc-400 hover:text-zinc-900 transition-colors duration-300"
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
    </div>
  );
}

/**
 * Tech stack badges as clickable pill-shaped tags.
 */
function Badges({ badges }: { badges: FooterBadge[] }) {
  if (!badges.length) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
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

/**
 * Running time counter with heartbeat icon and online/resting status.
 * Updates every second via setInterval.
 */
function RuntimeStatus({
  launchTime,
  enable,
}: {
  launchTime: string;
  enable: boolean;
}) {
  const [text, setText] = useState('');
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (!enable || !launchTime) return;
    const launch = new Date(launchTime);
    if (isNaN(launch.getTime())) return;

    const update = () => {
      const now = new Date();
      const diff = now.getTime() - launch.getTime();
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setText(`本站已运行 ${days} 天 ${hours} 小时 ${minutes} 分 ${seconds} 秒`);

      const hour = now.getHours();
      setIsOnline(hour >= 9 && hour < 18);
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [enable, launchTime]);

  if (!text) return null;

  return (
    <div className="flex items-center justify-center text-sm text-zinc-400 gap-2">
      <Heart className="w-4 h-4 text-red-400 animate-pulse" />
      <span>{text}</span>
      <Tag variant="light" size="sm" className={isOnline ? 'bg-green-100 text-green-700 border-green-200' : ''}>
        {isOnline ? '在线' : '休息中'}
      </Tag>
    </div>
  );
}

/**
 * Typed text effect: character-by-character display with
 * typewriter-style typing and deleting cycle.
 */
function TypedText({
  prefix,
  texts,
}: {
  prefix?: string;
  texts: string[];
}) {
  const [displayed, setDisplayed] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const currentPauseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!texts.length) return;
    const currentText = texts[textIndex];
    if (!currentText) return;

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (charIndex < currentText.length) {
            setDisplayed(currentText.slice(0, charIndex + 1));
            setCharIndex((prev) => prev + 1);
          } else {
            // Pause before deleting
            const pause = setTimeout(() => setIsDeleting(true), 2000);
            currentPauseRef.current = pause;
          }
        } else {
          if (charIndex > 0) {
            setDisplayed(currentText.slice(0, charIndex - 1));
            setCharIndex((prev) => prev - 1);
          } else {
            setIsDeleting(false);
            setTextIndex((prev) => (prev + 1) % texts.length);
          }
        }
      },
      isDeleting ? 50 : 100,
    );

    return () => {
      clearTimeout(timeout);
      if (currentPauseRef.current) {
        clearTimeout(currentPauseRef.current);
        currentPauseRef.current = null;
      }
    };
  }, [charIndex, isDeleting, textIndex, texts]);

  if (!texts.length) return null;

  return (
    <span>
      {prefix && <span>{prefix}</span>}
      <span className="text-zinc-900 font-medium">{displayed}</span>
      <span className="animate-pulse">|</span>
    </span>
  );
}

/**
 * Bottom footer bar with copyright, license info, typed text, and custom text.
 */
function FooterBar({
  owner,
  author,
  customText,
  typedTextPrefix,
  typedText,
}: {
  owner: FooterOwnerConfig;
  author: string;
  customText: string;
  typedTextPrefix?: string;
  typedText?: string[];
}) {
  const year = new Date().getFullYear();

  return (
    <div className="border-t border-zinc-100 bg-zinc-50">
      <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Left: copyright + CC license */}
        <div className="text-sm text-zinc-400 flex items-center gap-2">
          {owner.enable && (
            <span>
              &copy; {owner.since}&mdash;{year} {author}
            </span>
          )}
          <a
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-900 transition-colors duration-300 text-xs"
            title="CC BY-NC-SA 4.0"
          >
            CC BY-NC-SA 4.0
          </a>
        </div>

        {/* Right: typed text + custom text */}
        <div className="text-sm text-zinc-400 flex items-center gap-4">
          {typedText && typedText.length > 0 && (
            <TypedText prefix={typedTextPrefix} texts={typedText} />
          )}
          {customText && <span>{customText}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Motion Animations ───────────────────────────────

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

// ─── Config Hook ─────────────────────────────────────

function useFooterConfig() {
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

// ─── Default Value Helpers ───────────────────────────
// Each helper resolves ONE default value with minimal complexity (≤3).

function defSocialData(socialData: Record<string, string> | null): Record<string, string> {
  return socialData ?? {};
}

function defAvatarUrl(config: FooterConfigData | null): string | undefined {
  return config?.avatar;
}

function defSocialLinksConfig(config: FooterConfigData | null): FooterSocialLink[] | undefined {
  return config?.socialLinks;
}

function defLinks(config: FooterConfigData | null): FooterLinkGroup[] {
  return config?.links && config.links.length > 0 ? config.links : DEFAULT_LINKS;
}

function defBadges(config: FooterConfigData | null): FooterBadge[] {
  return config?.badges && config.badges.length > 0 ? config.badges : DEFAULT_BADGES;
}

function defTypedText(config: FooterConfigData | null): string[] {
  return config?.typedText && config.typedText.length > 0 ? config.typedText : DEFAULT_TYPED_TEXTS;
}

function defTypedTextPrefix(config: FooterConfigData | null): string {
  return config?.typedTextPrefix ?? '本站由 ';
}

function defOwner(config: FooterConfigData | null): FooterOwnerConfig {
  return config?.owner ?? { enable: true, since: 2020 };
}

function defAuthor(config: FooterConfigData | null): string {
  return config?.owner?.author ?? 'Originium Kernel';
}

function defCustomText(config: FooterConfigData | null): string {
  return config?.customText ?? '';
}

function defRuntimeEnable(config: FooterConfigData | null): boolean {
  return config?.runtime?.enable ?? false;
}

function defLaunchTime(config: FooterConfigData | null): string {
  return config?.runtime?.launchTime ?? '';
}

// ─── Main Footer Component ───────────────────────────

export default function Footer() {
  const { config, socialData, error } = useFooterConfig();
  const effectiveSocialData = defSocialData(socialData);
  const avatarUrl = defAvatarUrl(config);
  const socialLinksConfig = defSocialLinksConfig(config);
  const links = defLinks(config);
  const badges = defBadges(config);
  const typedText = defTypedText(config);
  const typedTextPrefix = defTypedTextPrefix(config);
  const owner = defOwner(config);
  const author = defAuthor(config);
  const customText = defCustomText(config);
  const runtimeEnable = defRuntimeEnable(config);
  const launchTime = defLaunchTime(config);

  return (
    <footer className="relative">
      {/* Gradient background: transparent → bg-zinc-50 */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-50/80 to-zinc-50 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-0 space-y-8">
        {/* 1. Social Bar */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <SocialBar
            socialData={effectiveSocialData}
            avatarUrl={avatarUrl}
            socialLinksConfig={socialLinksConfig}
          />
        </motion.div>

        {/* 2. Link Groups */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <LinkGroups groups={links} />
        </motion.div>

        {/* 3. Badges */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <Badges badges={badges} />
        </motion.div>

        {/* 4. Runtime Status */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <RuntimeStatus launchTime={launchTime} enable={runtimeEnable} />
        </motion.div>

        {/* Spacer */}
        <div className="pb-8" />
      </div>

      {/* 5. Footer Bar */}
      <FooterBar
        owner={owner}
        author={author}
        customText={customText}
        typedTextPrefix={typedTextPrefix}
        typedText={typedText}
      />

      {/* Error status: only show when no config could be loaded at all */}
      {error && !config && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-red-400">
          {error}
        </div>
      )}
    </footer>
  );
}
