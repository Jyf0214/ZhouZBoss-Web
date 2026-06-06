// Footer - 页脚主组件
// 负责装配：社交区（头像 + 社交图标）、链接组、徽章、运行时状态、版权底栏。
// 所有配置加载、默认值兜底、动画变体均来自 footer-config / 子组件本身。

'use client';

import React from 'react';
import { motion } from 'motion/react';

import { FooterAvatar } from './FooterAvatar';
import { FooterSocial } from './FooterSocial';
import { FooterLinkGroups, FooterBadges } from './FooterLinks';
import { FooterRuntimeStatus } from './FooterBrand';
import { FooterBar } from './FooterCopyright';
import {
  useFooterConfig,
  buildSocialEntries,
  defSocialData,
  defAvatarUrl,
  defSocialLinksConfig,
  defLinks,
  defBadges,
  defTypedText,
  defTypedTextPrefix,
  defOwner,
  defAuthor,
  defCustomText,
  defRuntimeEnable,
  defLaunchTime,
} from './footer-config';

// 区块统一的进入动画变体
const footerSectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

export default function Footer() {
  const { config, socialData, error } = useFooterConfig();

  // 解析后的最终值
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

  // 社交条目：构建一次，左右平分
  const socialEntries = buildSocialEntries(effectiveSocialData, socialLinksConfig);
  const mid = Math.ceil(socialEntries.length / 2);
  const leftSocial = socialEntries.slice(0, mid);
  const rightSocial = socialEntries.slice(mid);

  return (
    <footer className="relative">
      {/* 渐变背景：透明 → bg-zinc-50 */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-50/80 to-zinc-50 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-0 space-y-8">
        {/* 1. 社交区：左侧图标 + 居中头像 + 右侧图标 */}
        {(leftSocial.length > 0 || rightSocial.length > 0 || avatarUrl) && (
          <motion.div
            variants={footerSectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            <div className="flex items-center justify-center">
              <FooterSocial entries={leftSocial} />
              <FooterAvatar avatarUrl={avatarUrl} hasSiblings={leftSocial.length + rightSocial.length > 0} />
              <FooterSocial entries={rightSocial} />
            </div>
          </motion.div>
        )}

        {/* 2. 链接组 */}
        <motion.div
          variants={footerSectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <FooterLinkGroups groups={links} />
        </motion.div>

        {/* 3. 技术栈徽章 */}
        <motion.div
          variants={footerSectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <FooterBadges badges={badges} />
        </motion.div>

        {/* 4. 运行时状态 */}
        <motion.div
          variants={footerSectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <FooterRuntimeStatus launchTime={launchTime} enable={runtimeEnable} />
        </motion.div>

        {/* 间隔 */}
        <div className="pb-8" />
      </div>

      {/* 5. 版权底栏 */}
      <FooterBar
        owner={owner}
        author={author}
        customText={customText}
        typedTextPrefix={typedTextPrefix}
        typedText={typedText}
      />

      {/* 错误提示：仅在完全无法加载配置时显示 */}
      {error && !config && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-red-400">
          {error}
        </div>
      )}
    </footer>
  );
}
