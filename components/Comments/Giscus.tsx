'use client';

import { useEffect, useRef } from 'react';

export interface GiscusProps {
  /** 文章 slug（用于未来切换 data-mapping='specific' 时定位讨论） */
  slug: string;
}

/**
 * 读取 Giscus 所需的环境变量
 *
 * TODO: 配置 Giscus 评论系统
 *
 * 1. 访问 https://giscus.app/zh-CN 选择仓库与 Discussion 分类
 * 2. 打开目标仓库 Settings → General → Features → 勾选 Discussions
 * 3. 复制页面底部 "启用 giscus" 区域生成的四个值
 * 4. 写入 .env.local 或部署平台环境变量：
 *      NEXT_PUBLIC_GISCUS_REPO=owner/repo
 *      NEXT_PUBLIC_GISCUS_REPO_ID=R_xxxxxxxx
 *      NEXT_PUBLIC_GISCUS_CATEGORY=Announcements
 *      NEXT_PUBLIC_GISCUS_CATEGORY_ID=DIC_xxxxxxxx
 * 5. 重新构建后即可在文章页底部看到评论区
 *
 * 说明：四个变量任一缺失时，组件会渲染占位符，不加载外部脚本，
 * 既保证未配置时构建/运行不报错，也避免注入会失败的脚本。
 */
function readGiscusConfig() {
  return {
    repo: process.env.NEXT_PUBLIC_GISCUS_REPO ?? '',
    repoId: process.env.NEXT_PUBLIC_GISCUS_REPO_ID ?? '',
    category: process.env.NEXT_PUBLIC_GISCUS_CATEGORY ?? '',
    categoryId: process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID ?? '',
  };
}

export function Giscus({ slug }: GiscusProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const config = readGiscusConfig();

  // feature flag：四个变量必须都存在才加载 Giscus 客户端脚本
  const enabled =
    config.repo !== '' &&
    config.repoId !== '' &&
    config.category !== '' &&
    config.categoryId !== '';

  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    // 防止 React 严格模式或重复渲染时脚本被重复注入
    const existing = container.querySelector('script[data-giscus-script]');
    if (existing) return;

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-giscus-script', 'true');
    script.setAttribute('data-repo', config.repo);
    script.setAttribute('data-repo-id', config.repoId);
    script.setAttribute('data-category', config.category);
    script.setAttribute('data-category-id', config.categoryId);
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', 'light');
    script.setAttribute('data-lang', 'zh-CN');

    container.appendChild(script);

    return () => {
      script.remove();
      container.querySelectorAll('iframe').forEach(f => f.remove());
    };
  }, [enabled, config.repo, config.repoId, config.category, config.categoryId]);

  if (!enabled) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="mt-12"
      data-giscus-container
      data-slug={slug}
    />
  );
}
