// Footer 模块共用类型定义
// 所有页脚相关的接口、配置项与运行时数据均在此集中声明。

/** 站点所有者信息（用于版权区显示） */
export interface FooterOwnerConfig {
  enable: boolean;
  since: number;
  author?: string;
}

/** 站点运行时信息（用于运行时间计数器） */
export interface FooterRuntimeConfig {
  enable: boolean;
  launchTime: string;
}

/** 社交链接条目（来自配置） */
export interface FooterSocialLink {
  name: string;
  icon: string;
}

/** 单个链接条目 */
export interface FooterLinkItem {
  name: string;
  url: string;
}

/** 链接分组（按主题聚合多个链接） */
export interface FooterLinkGroup {
  group: string;
  items: FooterLinkItem[];
}

/** 技术栈徽章（点击可跳转） */
export interface FooterBadge {
  name: string;
  url: string;
}

/** 页脚完整配置数据（来自 /api/config 中的 footer 字段） */
export interface FooterConfigData {
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

/** 解析后的社交条目（name + url + icon 名称） */
export interface FooterSocialEntry {
  name: string;
  url: string;
  icon: string;
}
