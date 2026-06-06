import type { ReactNode } from 'react';

/* ============================================================
   平台定义
   ============================================================ */

export interface PlatformDef {
  id: string;
  name: string;
  color: string;
  hoverColor: string;
  icon: ReactNode;
  /** 返回分享 URL，返回 null 表示需要特殊处理（如复制链接） */
  shareUrl: (url: string, title: string) => string | null;
}

/* ============================================================
   ShareButtonItem 子组件 Props
   ============================================================ */

export interface ShareButtonItemProps {
  platform: PlatformDef;
  url: string;
  title: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onCopy?: () => void;
  onClick?: () => void;
  onWeChat?: () => void;
}

/* ============================================================
   ShareButtons 主组件 Props
   ============================================================ */

export type ShareConfig = {
  sharejs?: { enable?: boolean; sites?: string };
  addtoany?: { enable?: boolean; item?: string };
} | null;

export interface ShareButtonsProps {
  /** 布局模式：horizontal（默认） | floating | compact */
  variant?: 'horizontal' | 'floating' | 'compact';
  /** 直接指定要显示的平台的 id 列表（优先级高于 config） */
  platforms?: string[];
  /** 页面 URL，默认从 window.location.href 读取 */
  url?: string;
  /** 页面标题，默认从 document.title 读取 */
  title?: string;
  /** 从 config.yaml 传入的 share 配置 */
  config?: ShareConfig;
  /** 是否显示「更多」按钮（打开 ShareModal），默认 true（compact 模式下始终显示） */
  showMore?: boolean;
}
