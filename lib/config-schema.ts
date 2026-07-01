/**
 * AppConfig Zod Schema
 *
 * 此文件用 Zod schema 完整描述 next.config.ts 中原有的所有 AppConfig 接口。
 *
 * 设计目标:
 * 1. 单一事实源 (single source of truth):类型与运行时校验共用同一份声明
 * 2. 对部分配置保持宽容:.default() 覆盖所有字段,即便 YAML 只写了一部分也能解析成功
 * 3. 对未知字段保持严格:根级 .strict() 拒绝根级未知 key
 *    (例如之前曾出现的 `_testField`,会被立即抛错而不是被静默吞掉)
 * 4. 解析失败的报错信息明确指出问题字段,便于快速定位 config.yaml 错误
 *
 * 兼容性:
 * - 通过 z.infer 推导出的 TypeScript 类型与原 interface 保持字段一致
 * - 旧代码从 '@/next.config' 导入类型仍然可用 (next.config.ts 中 re-export)
 */

import { z } from 'zod';

// ============================================================================
// 工具:把"已带 field defaults 的子 schema"再包一层,使其在父级缺失时
// 也能给出"完整字段已填充"的默认值 (而不是只填 {})
// ============================================================================

/**
 * 给子 schema 加上"用自身默认值填好"的 .default
 *
 * 背景:Zod 中 `z.object({a: z.string().default('x')}).default({})`
 * 解析缺失字段时返回的是字面值 `{}`,**不会**再触发 a 的默认。
 * 这导致 `zAppConfig.parse({})` 得到的子对象字段全空。
 * 用 `schema.default(schema.parse({}))` 作为兜底,
 * 让默认值就是"按 field defaults 跑完一遍 parse 之后的结果"。
 *
 * 使用方式:任何把"带嵌套结构的子 schema"挂到父 schema 的属性时,
 * 都应包一层 withFullDefault,以保证任意层级 parse({}) 都能拿到完整对象。
 */
const withFullDefault = <T extends z.ZodObject>(s: T): z.ZodDefault<T> =>
  s.default(s.parse({}) as never);

// ============================================================================
// 基础枚举
// ============================================================================

const zLoadingType = z.enum(['spinner', 'text', 'dots', 'glow', 'waves', 'antd']);
const zLoadingPosition = z.enum(['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right']);
const zDateType = z.enum(['created', 'updated', 'both']);
const zDateFormat = z.enum(['date', 'relative', 'simple']);
const zCoverPosition = z.enum(['left', 'right', 'both']);
const zMainToneMode = z.enum(['cdn', 'api', 'both']);

// ============================================================================
// SiteConfig
// ============================================================================

export const zSiteConfig = z.object({
  title: z.string().default(''),
  description: z.string().default(''),
  heroTitleLine1: z.string().default(''),
  heroTitleLine2: z.string().default(''),
  lang: z.string().default('zh-CN'),
});

// ============================================================================
// AppearanceConfig
// ============================================================================

export const zAppearanceConfig = z.object({
  fontSize: z.number().int().positive().default(16),
  background: withFullDefault(z.object({
    url: z.string().default(''),
    opacity: z.number().min(0).max(1).default(1),
  })),
  customCSS: z.string().default(''),
  customHead: z.string().default(''),
  loading: withFullDefault(z.object({
    page: withFullDefault(z.object({
      type: zLoadingType.default('spinner'),
      color: z.string().default('#c084fc'),
      position: zLoadingPosition.default('center'),
    })),
    navigation: withFullDefault(z.object({
      type: zLoadingType.default('spinner'),
      color: z.string().default('#c084fc'),
    })),
    slogans: z.array(z.string()).default([]),
  })),
});

// ============================================================================
// AccessConfig
// ============================================================================

export const zAccessSection = z.object({
  public: z.array(z.string()).default([]),
  private: z.array(z.string()).default([]),
});

export const zAccessConfig = z.object({
  posts: withFullDefault(zAccessSection),
  faces: withFullDefault(zAccessSection),
  diary: withFullDefault(zAccessSection),
});

// ============================================================================
// AuthConfig
// ============================================================================

export const zAuthConfig = z.object({
  allowRegistration: z.boolean().default(false),
  admin: z.object({
    avatar: z.string().default(''),
  }).optional(),
});

// ============================================================================
// NavConfig
// ============================================================================

export const zNavMenuItem = z.object({
  name: z.string().default(''),
  link: z.string().default(''),
  icon: z.string().optional(),
});

export const zNavMenuGroup = z.object({
  title: z.string().default(''),
  item: z.array(zNavMenuItem).default([]),
});

export const zNavConfig = z.object({
  enable: z.boolean().default(false),
  travelling: z.boolean().default(false),
  clock: z.boolean().default(false),
  menu: z.array(zNavMenuGroup).default([]),
});

// ============================================================================
// MournConfig
// ============================================================================

export const zMournConfig = z.object({
  enable: z.boolean().default(false),
  days: z.array(z.string()).default([]),
});

// ============================================================================
// HighlightConfig
// ============================================================================

export const zHighlightConfig = z.object({
  theme: z.string().default('light'),
  copy: z.boolean().default(true),
  lang: z.boolean().default(true),
  shrink: z.boolean().default(false),
  heightLimit: z.number().int().nonnegative().default(330),
  wordWrap: z.boolean().default(true),
});

// ============================================================================
// CopyConfig
// ============================================================================

export const zCopyConfig = z.object({
  enable: z.boolean().default(true),
  copyright: withFullDefault(z.object({
    enable: z.boolean().default(false),
    limitCount: z.number().int().nonnegative().default(50),
  })),
});

// ============================================================================
// SocialConfig (Record<string, string>)
// ============================================================================

export const zSocialConfig = z.record(z.string(), z.string());

// ============================================================================
// AuthorStatusConfig
// ============================================================================

export const zAuthorStatusConfig = z.object({
  enable: z.boolean().default(false),
  statusImg: z.string().default(''),
  skills: z.array(z.string()).default([]),
});

// ============================================================================
// CoverConfig
// ============================================================================

export const zCoverConfig = z.object({
  indexEnable: z.boolean().default(true),
  asideEnable: z.boolean().default(true),
  archivesEnable: z.boolean().default(true),
  position: zCoverPosition.default('left'),
  defaultCover: z.array(z.string()).default([]),
});

// ============================================================================
// ErrorImgConfig
// ============================================================================

export const zErrorImgConfig = z.object({
  flink: z.string().default('/img/friend_404.gif'),
  postPage: z.string().default('/img/404.jpg'),
});

// ============================================================================
// PostMetaConfig
// ============================================================================

export const zPostMetaDisplayConfig = z.object({
  dateType: zDateType.default('created'),
  dateFormat: zDateFormat.default('date'),
  categories: z.boolean().default(true),
  tags: z.boolean().default(true),
  label: z.boolean().default(false),
});

export const zPostMetaPostConfig = z.object({
  dateType: zDateType.default('created'),
  dateFormat: zDateFormat.default('date'),
  categories: z.boolean().default(true),
  tags: z.boolean().default(true),
  label: z.boolean().default(true),
  unread: z.boolean().default(false),
});

export const zPostMetaConfig = z.object({
  page: withFullDefault(zPostMetaDisplayConfig),
  post: withFullDefault(zPostMetaPostConfig),
});

// ============================================================================
// WordCountConfig
// ============================================================================

export const zWordCountConfig = z.object({
  enable: z.boolean().default(false),
  postWordcount: z.boolean().default(false),
  min2read: z.boolean().default(true),
  totalWordcount: z.boolean().default(false),
});

// ============================================================================
// TocConfig
// ============================================================================

export const zTocConfig = z.object({
  post: z.boolean().default(true),
  page: z.boolean().default(false),
  number: z.boolean().default(true),
  expand: z.boolean().default(false),
  styleSimple: z.boolean().default(false),
});

// ============================================================================
// CopyrightConfig
// ============================================================================

export const zCopyrightConfig = z.object({
  enable: z.boolean().default(true),
  decode: z.boolean().default(false),
  authorHref: z.string().default(''),
  location: z.string().default('中国'),
  license: z.string().default('CC BY-NC-SA 4.0'),
  licenseUrl: z.string().default('https://creativecommons.org/licenses/by-nc-sa/4.0/'),
  avatarSinks: z.boolean().default(true),
  authorImgBack: z.string().default(''),
  authorImgFront: z.string().default(''),
  authorLink: z.string().default('/'),
});

// ============================================================================
// RewardConfig
// ============================================================================

export const zQRCodeItem = z.object({
  img: z.string().default(''),
  link: z.string().default(''),
  text: z.string().default(''),
});

export const zRewardConfig = z.object({
  enable: z.boolean().default(true),
  qrCodes: z.array(zQRCodeItem).default([]),
});

// ============================================================================
// PostEditConfig
// ============================================================================

export const zPostEditConfig = z.object({
  enable: z.boolean().default(false),
  github: z.union([z.string(), z.literal(false)]).default(false),
});

// ============================================================================
// ShareConfig
// ============================================================================

export const zSharejsConfig = z.object({
  enable: z.boolean().default(true),
  sites: z.string().default('facebook,twitter,wechat,weibo,qq'),
});

export const zAddtoanyConfig = z.object({
  enable: z.boolean().default(false),
  item: z.string().default('facebook,twitter,wechat,sina_weibo,email,copy_link'),
});

export const zShareConfig = z.object({
  sharejs: withFullDefault(zSharejsConfig),
  addtoany: withFullDefault(zAddtoanyConfig),
});

// ============================================================================
// MainToneConfig
// ============================================================================

export const zMainToneConfig = z.object({
  enable: z.boolean().default(false),
  mode: zMainToneMode.default('api'),
});

// ============================================================================
// FooterConfig
// ============================================================================

export const zFooterOwnerConfig = z.object({
  enable: z.boolean().default(true),
  since: z.number().int().nonnegative().default(2020),
  author: z.string().optional(),
});

export const zFooterRuntimeConfig = z.object({
  enable: z.boolean().default(false),
  launchTime: z.string().default('04/01/2021 00:00:00'),
});

export const zFooterSocialLink = z.object({
  name: z.string().default(''),
  icon: z.string().default(''),
});

export const zFooterLinkItem = z.object({
  name: z.string().default(''),
  url: z.string().default(''),
});

export const zFooterLinkGroup = z.object({
  group: z.string().default(''),
  items: z.array(zFooterLinkItem).default([]),
});

export const zFooterBadge = z.object({
  name: z.string().default(''),
  url: z.string().default(''),
});

export const zFooterConfig = z.object({
  owner: withFullDefault(zFooterOwnerConfig),
  customText: z.string().default(''),
  runtime: withFullDefault(zFooterRuntimeConfig),
  avatar: z.string().optional(),
  socialLinks: z.array(zFooterSocialLink).optional(),
  links: z.array(zFooterLinkGroup).optional(),
  badges: z.array(zFooterBadge).optional(),
  typedTextPrefix: z.string().optional(),
  typedText: z.array(z.string()).optional(),
});

// ============================================================================
// ClerkConfig
// ============================================================================

export const zClerkConfig = z.object({
  enable: z.boolean().default(false),
});

// ============================================================================
// UserConfig / Users
// ============================================================================

export const zUserConfig = z.object({
  avatar: z.string().optional(),
});

// ============================================================================
// MusicConfig
// ============================================================================

export const zMusicItem = z.object({
  name: z.string().default(''),
  artist: z.string().default(''),
  url: z.string().default(''),
  cover: z.string().default(''),
});

export const zMusicConfig = z.object({
  enable: z.boolean().default(false),
  autoPlay: z.boolean().default(false),
  songs: z.array(zMusicItem).default([]),
});

// ============================================================================
// Root AppConfig
// ============================================================================

/**
 * 根 schema:在解析时启用 .strict() 拒绝根级未知 key
 * (例如之前出现过的 _testField 等遗留字段,会立即被 Zod 报错)
 *
 * 子 schema 走 Zod 默认的 strip 模式:未声明的子键会被自动丢弃,
 * 既能容忍部分配置,又不会把未知键混入最终结果。
 *
 * 所有顶层字段均通过 withFullDefault 包一层,确保:
 * - 字段缺失时使用"按 field defaults 跑过一遍 parse 的完整对象"作兜底
 * - 这样 zAppConfig.parse({}) 能得到一个全字段填好的默认配置
 */
export const zAppConfig = z.object({
  site: withFullDefault(zSiteConfig),
  appearance: withFullDefault(zAppearanceConfig),
  access: withFullDefault(zAccessConfig),
  auth: withFullDefault(zAuthConfig),
  nav: withFullDefault(zNavConfig),
  mourn: withFullDefault(zMournConfig),
  highlight: withFullDefault(zHighlightConfig),
  copy: withFullDefault(zCopyConfig),
  social: zSocialConfig.default({}),
  authorStatus: withFullDefault(zAuthorStatusConfig),
  cover: withFullDefault(zCoverConfig),
  errorImg: withFullDefault(zErrorImgConfig),
  postMeta: withFullDefault(zPostMetaConfig),
  wordcount: withFullDefault(zWordCountConfig),
  toc: withFullDefault(zTocConfig),
  copyright: withFullDefault(zCopyrightConfig),
  reward: withFullDefault(zRewardConfig),
  postEdit: withFullDefault(zPostEditConfig),
  share: withFullDefault(zShareConfig),
  mainTone: withFullDefault(zMainToneConfig),
  footer: withFullDefault(zFooterConfig),
  clerk: withFullDefault(zClerkConfig),
  music: withFullDefault(zMusicConfig),
  users: z.record(z.string(), zUserConfig).default({}),
}).strict();

// ============================================================================
// 推导出的 TypeScript 类型 (供业务代码直接 import)
// ============================================================================
//
// 注:AppConfig 及子类型采用**手写 interface**而非 `z.infer`,原因:
// 1. Zod 的 `.default() + .strict()` 推断出的类型会把所有字段标记为"必填",
//    这与业务代码(尤其 `app/api/config/route.ts` 的 `mergeAppConfig`)
//    长期依赖的"部分顶层字段可选"语义不兼容,会触发 17+ 个 TS2769 / TS2345。
// 2. 手写 interface 保留原 `next.config.ts` 中标记为 `?` 的可选字段,
//    让 `mergeAppConfig` 之类的合并函数可以返回 `T | undefined`。
// 3. 运行时校验仍由 `zAppConfig.strict()` 负责,未知 key 仍会被立即抛错。
//    Zod schema 是单一事实源;这里导出的 interface 只是把 schema 推断出来的
//    "过严"类型放宽到与原 next.config.ts 一致的可选项。
// ============================================================================

export interface SiteConfig {
  title: string;
  description: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  lang: string;
}

export interface AppearanceConfig {
  /** 全局基础字号(px),默认 16,可在网页端配置 */
  fontSize?: number;
  background: {
    url: string;
    opacity: number;
  };
  customCSS: string;
  customHead: string;
  loading?: {
    page?: {
      type: 'spinner' | 'text' | 'dots' | 'glow' | 'waves' | 'antd';
      color?: string;
      position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    };
    navigation?: {
      type: 'spinner' | 'text' | 'dots' | 'glow' | 'waves' | 'antd';
      color?: string;
    };
    slogans?: string[];
  };
}

export interface AccessSection {
  public: string[];
  private: string[];
}

export interface AccessConfig {
  posts: AccessSection;
  faces: AccessSection;
  diary: AccessSection;
}

export interface AuthConfig {
  allowRegistration: boolean;
  admin?: {
    avatar?: string;
  };
}

export interface NavMenuItem {
  name: string;
  link: string;
  icon?: string;
}

export interface NavMenuGroup {
  title: string;
  item: NavMenuItem[];
}

export interface NavConfig {
  enable: boolean;
  travelling: boolean;
  clock: boolean;
  menu: NavMenuGroup[];
}

export interface MournConfig {
  enable: boolean;
  days: string[];
}

export interface HighlightConfig {
  theme: string;
  copy: boolean;
  lang: boolean;
  shrink: boolean;
  heightLimit: number;
  wordWrap: boolean;
}

export interface CopyConfig {
  enable: boolean;
  copyright: {
    enable: boolean;
    limitCount: number;
  };
}

export type SocialConfig = Record<string, string>;

export interface AuthorStatusConfig {
  enable: boolean;
  statusImg: string;
  skills: string[];
}

export interface CoverConfig {
  indexEnable: boolean;
  asideEnable: boolean;
  archivesEnable: boolean;
  position: 'left' | 'right' | 'both';
  defaultCover: string[];
}

export interface ErrorImgConfig {
  flink: string;
  postPage: string;
}

export interface PostMetaDisplayConfig {
  dateType: 'created' | 'updated' | 'both';
  dateFormat: 'date' | 'relative' | 'simple';
  categories: boolean;
  tags: boolean;
  label: boolean;
}

export interface PostMetaPostConfig extends PostMetaDisplayConfig {
  unread: boolean;
}

export interface PostMetaConfig {
  page: PostMetaDisplayConfig & { dateFormat: 'date' | 'relative' | 'simple' };
  post: PostMetaPostConfig;
}

export interface WordCountConfig {
  enable: boolean;
  postWordcount: boolean;
  min2read: boolean;
  totalWordcount: boolean;
}

export interface TocConfig {
  post: boolean;
  page: boolean;
  number: boolean;
  expand: boolean;
  styleSimple: boolean;
}

export interface CopyrightConfig {
  enable: boolean;
  decode: boolean;
  authorHref: string;
  location: string;
  license: string;
  licenseUrl: string;
  avatarSinks: boolean;
  authorImgBack: string;
  authorImgFront: string;
  authorLink: string;
}

export interface QRCodeItem {
  img: string;
  link: string;
  text: string;
}

export interface RewardConfig {
  enable: boolean;
  qrCodes: QRCodeItem[];
}

export interface PostEditConfig {
  enable: boolean;
  github: string | false;
}

export interface SharejsConfig {
  enable: boolean;
  sites: string;
}

export interface AddtoanyConfig {
  enable: boolean;
  item: string;
}

export interface ShareConfig {
  sharejs: SharejsConfig;
  addtoany: AddtoanyConfig;
}

export interface MainToneConfig {
  enable: boolean;
  mode: 'cdn' | 'api' | 'both';
}

export interface FooterOwnerConfig {
  enable: boolean;
  since: number;
  author?: string;
}

export interface FooterRuntimeConfig {
  enable: boolean;
  launchTime: string;
}

export interface FooterSocialLink {
  name: string;
  icon: string;
}

export interface FooterLinkItem {
  name: string;
  url: string;
}

export interface FooterLinkGroup {
  group: string;
  items: FooterLinkItem[];
}

export interface FooterBadge {
  name: string;
  url: string;
}

export interface FooterConfig {
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

export interface ClerkConfig {
  enable: boolean;
}

export interface MusicItem {
  name: string;
  artist: string;
  url: string;
  cover: string;
}

export interface MusicConfig {
  enable: boolean;
  autoPlay: boolean;
  songs: MusicItem[];
}

export interface UserConfig {
  avatar?: string;
}

export interface AppConfig {
  site: SiteConfig;
  appearance: AppearanceConfig;
  access: AccessConfig;
  auth: AuthConfig;
  nav?: NavConfig;
  mourn?: MournConfig;
  highlight?: HighlightConfig;
  copy?: CopyConfig;
  social?: SocialConfig;
  authorStatus?: AuthorStatusConfig;
  cover?: CoverConfig;
  errorImg?: ErrorImgConfig;
  postMeta?: PostMetaConfig;
  wordcount?: WordCountConfig;
  toc?: TocConfig;
  copyright?: CopyrightConfig;
  reward?: RewardConfig;
  postEdit?: PostEditConfig;
  share?: ShareConfig;
  mainTone?: MainToneConfig;
  footer?: FooterConfig;
  clerk?: ClerkConfig;
  music?: MusicConfig;
  users?: Record<string, UserConfig>;
}
