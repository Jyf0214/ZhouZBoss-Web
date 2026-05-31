export type LoadingType = 'spinner' | 'text' | 'dots' | 'glow' | 'waves' | 'antd';
export type LoadingPosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface UserConfig {
  avatar?: string;
}

export interface NavMenuItemData {
  name: string;
  link: string;
  icon?: string;
}

export interface NavMenuGroupData {
  title: string;
  item: NavMenuItemData[];
}

export interface NavConfigData {
  enable: boolean;
  travelling: boolean;
  clock: boolean;
  menu: NavMenuGroupData[];
}

export interface ConfigState {
  site: {
    title: string;
    description: string;
    heroTitleLine1: string;
    heroTitleLine2: string;
    lang: string;
  };
  appearance: {
    fontSize?: number;
    background: {
      url: string;
      opacity: number;
    };
    customCSS: string;
    customHead: string;
    loading?: {
      page?: {
        type: LoadingType;
        color: string;
        position: LoadingPosition;
      };
      navigation?: {
        type: LoadingType;
        color: string;
      };
      slogans?: string[];
    };
  };
  access: {
    posts: { public: string[]; private: string[] };
    faces: { public: string[]; private: string[] };
    diary: { public: string[]; private: string[] };
  };
  auth: {
    allowRegistration: boolean;
    admin?: { avatar?: string };
  };
  nav: NavConfigData;
  mourn: { enable: boolean; days: string[] };
  highlight: { theme: string; copy: boolean; lang: boolean; shrink: boolean; heightLimit: number; wordWrap: boolean };
  copy: { enable: boolean; copyright: { enable: boolean; limitCount: number } };
  social: Record<string, string>;
  authorStatus: { enable: boolean; statusImg: string; skills: string[] };
  cover: { indexEnable: boolean; asideEnable: boolean; archivesEnable: boolean; position: 'left' | 'right' | 'both'; defaultCover: string[] };
  errorImg: { flink: string; postPage: string };
  share: { sharejs: { enable: boolean; sites: string }; addtoany: { enable: boolean; item: string } };
  mainTone: { enable: boolean; mode: 'cdn' | 'api' | 'both' };
  footer: { owner: { enable: boolean; since: number }; customText: string; runtime: { enable: boolean; launchTime: string } };
  postMeta: {
    page: { dateType: string; dateFormat: string; categories: boolean; tags: boolean; label: boolean };
    post: { dateType: string; dateFormat: string; categories: boolean; tags: boolean; label: boolean; unread: boolean };
  };
  wordcount: { enable: boolean; postWordcount: boolean; min2read: boolean; totalWordcount: boolean };
  toc: { post: boolean; page: boolean; number: boolean; expand: boolean; styleSimple: boolean };
  copyright: { enable: boolean; decode: boolean; authorHref: string; location: string; license: string; licenseUrl: string; avatarSinks: boolean; authorImgBack: string; authorImgFront: string; authorLink: string };
  reward: { enable: boolean; qrCodes: { img: string; link: string; text: string }[] };
  postEdit: { enable: boolean; github: string | false };
  users?: Record<string, UserConfig>;
}

export function buildSiteConfig(data: Record<string, unknown>): ConfigState['site'] {
  const siteData = data.site as Record<string, string> | undefined;
  return {
    title: siteData?.title ?? 'Originium Kernel',
    description: siteData?.description ?? '',
    heroTitleLine1: siteData?.heroTitleLine1 ?? '',
    heroTitleLine2: siteData?.heroTitleLine2 ?? '',
    lang: siteData?.lang ?? 'zh-CN',
  };
}

export function buildAppearanceConfig(data: Record<string, unknown>): ConfigState['appearance'] {
  const appearanceData = data.appearance as Record<string, unknown> | undefined;
  return {
    fontSize: (appearanceData?.fontSize as number) ?? 15,
    background: (appearanceData?.background as ConfigState['appearance']['background']) ?? { url: '', opacity: 0.8 },
    customCSS: (appearanceData?.customCSS as string) ?? '',
    customHead: (appearanceData?.customHead as string) ?? '',
    loading: (appearanceData?.loading as ConfigState['appearance']['loading']) ?? {
      page: { type: 'waves', color: '#c084fc', position: 'center' },
      navigation: { type: 'antd', color: '#c084fc' },
    },
  };
}

export function buildAccessConfig(data: Record<string, unknown>): ConfigState['access'] {
  return (data.access as ConfigState['access']) || {
    posts: { public: ['*'], private: [] },
    faces: { public: [], private: ['*'] },
    diary: { public: [], private: ['*'] },
  };
}

export function buildAuthConfig(data: Record<string, unknown>): ConfigState['auth'] {
  return (data.auth as ConfigState['auth']) || { allowRegistration: true };
}

export function buildNavConfig(data: Record<string, unknown>): ConfigState['nav'] {
  const navData = data.nav as Record<string, unknown> | undefined;
  if (!navData) {
    return { enable: false, travelling: false, clock: false, menu: [] };
  }
  return {
    enable: (navData.enable as boolean) ?? false,
    travelling: (navData.travelling as boolean) ?? false,
    clock: (navData.clock as boolean) ?? false,
    menu: (navData.menu as NavMenuGroupData[]) ?? [],
  };
}

export function buildMournConfig(data: Record<string, unknown>): ConfigState['mourn'] {
  const d = data.mourn as Record<string, unknown> | undefined;
  return { enable: (d?.enable as boolean) ?? false, days: (d?.days as string[]) ?? [] };
}

export function buildHighlightConfig(data: Record<string, unknown>): ConfigState['highlight'] {
  const d = data.highlight as Record<string, unknown> | undefined;
  return {
    theme: (d?.theme as string) ?? 'light',
    copy: (d?.copy as boolean) ?? true,
    lang: (d?.lang as boolean) ?? true,
    shrink: (d?.shrink as boolean) ?? false,
    heightLimit: (d?.heightLimit as number) ?? 330,
    wordWrap: (d?.wordWrap as boolean) ?? true,
  };
}

export function buildCopyConfig(data: Record<string, unknown>): ConfigState['copy'] {
  const d = data.copy as Record<string, unknown> | undefined;
  const cr = d?.copyright as Record<string, unknown> | undefined;
  return {
    enable: (d?.enable as boolean) ?? false,
    copyright: {
      enable: (cr?.enable as boolean) ?? false,
      limitCount: (cr?.limitCount as number) ?? 50,
    },
  };
}

export function buildSocialConfig(data: Record<string, unknown>): ConfigState['social'] {
  return (data.social as Record<string, string>) ?? {};
}

export function buildAuthorStatusConfig(data: Record<string, unknown>): ConfigState['authorStatus'] {
  const d = data.authorStatus as Record<string, unknown> | undefined;
  return {
    enable: (d?.enable as boolean) ?? false,
    statusImg: (d?.statusImg as string) ?? '',
    skills: (d?.skills as string[]) ?? [],
  };
}

export function buildCoverConfig(data: Record<string, unknown>): ConfigState['cover'] {
  const d = data.cover as Record<string, unknown> | undefined;
  return {
    indexEnable: (d?.indexEnable as boolean) ?? true,
    asideEnable: (d?.asideEnable as boolean) ?? true,
    archivesEnable: (d?.archivesEnable as boolean) ?? true,
    position: (d?.position as 'left' | 'right' | 'both') ?? 'left',
    defaultCover: (d?.defaultCover as string[]) ?? [],
  };
}

export function buildErrorImgConfig(data: Record<string, unknown>): ConfigState['errorImg'] {
  const d = data.errorImg as Record<string, unknown> | undefined;
  return {
    flink: (d?.flink as string) ?? '/img/friend_404.gif',
    postPage: (d?.postPage as string) ?? '/img/404.jpg',
  };
}

function buildPageMeta(data: Record<string, unknown> | undefined): ConfigState['postMeta']['page'] {
  return {
    dateType: (data?.dateType as string) ?? 'created',
    dateFormat: (data?.dateFormat as string) ?? 'simple',
    categories: (data?.categories as boolean) ?? false,
    tags: (data?.tags as boolean) ?? false,
    label: (data?.label as boolean) ?? false,
  };
}

function buildPostMeta(data: Record<string, unknown> | undefined): ConfigState['postMeta']['post'] {
  return {
    dateType: (data?.dateType as string) ?? 'both',
    dateFormat: (data?.dateFormat as string) ?? 'date',
    categories: (data?.categories as boolean) ?? false,
    tags: (data?.tags as boolean) ?? false,
    label: (data?.label as boolean) ?? false,
    unread: (data?.unread as boolean) ?? false,
  };
}

export function buildPostMetaConfig(data: Record<string, unknown>): ConfigState['postMeta'] {
  const d = data.postMeta as Record<string, unknown> | undefined;
  return {
    page: buildPageMeta(d?.page as Record<string, unknown> | undefined),
    post: buildPostMeta(d?.post as Record<string, unknown> | undefined),
  };
}

export function buildWordCountConfig(data: Record<string, unknown>): ConfigState['wordcount'] {
  const d = data.wordcount as Record<string, unknown> | undefined;
  return {
    enable: (d?.enable as boolean) ?? false,
    postWordcount: (d?.postWordcount as boolean) ?? false,
    min2read: (d?.min2read as boolean) ?? false,
    totalWordcount: (d?.totalWordcount as boolean) ?? false,
  };
}

export function buildTocConfig(data: Record<string, unknown>): ConfigState['toc'] {
  const d = data.toc as Record<string, unknown> | undefined;
  return {
    post: (d?.post as boolean) ?? false,
    page: (d?.page as boolean) ?? false,
    number: (d?.number as boolean) ?? false,
    expand: (d?.expand as boolean) ?? false,
    styleSimple: (d?.styleSimple as boolean) ?? false,
  };
}

const COPYRIGHT_DEFAULTS: ConfigState['copyright'] = {
  enable: false,
  decode: false,
  authorHref: '',
  location: '中国',
  license: 'CC BY-NC-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  avatarSinks: true,
  authorImgBack: '',
  authorImgFront: '',
  authorLink: '/',
};

export function buildCopyrightConfig(data: Record<string, unknown>): ConfigState['copyright'] {
  const d = data.copyright as Partial<ConfigState['copyright']>;
  if (!d) return COPYRIGHT_DEFAULTS;
  return { ...COPYRIGHT_DEFAULTS, ...d };
}

export function buildRewardConfig(data: Record<string, unknown>): ConfigState['reward'] {
  const d = data.reward as Record<string, unknown> | undefined;
  return {
    enable: (d?.enable as boolean) ?? false,
    qrCodes: (d?.qrCodes as ConfigState['reward']['qrCodes']) ?? [],
  };
}

export function buildPostEditConfig(data: Record<string, unknown>): ConfigState['postEdit'] {
  const d = data.postEdit as Record<string, unknown> | undefined;
  return {
    enable: (d?.enable as boolean) ?? false,
    github: (d?.github as string | false) ?? false,
  };
}

export function buildShareConfig(data: Record<string, unknown>): ConfigState['share'] {
  const d = data.share as Record<string, unknown> | undefined;
  const sharejs = d?.sharejs as Record<string, unknown> | undefined;
  const addtoany = d?.addtoany as Record<string, unknown> | undefined;
  return {
    sharejs: {
      enable: (sharejs?.enable as boolean) ?? false,
      sites: (sharejs?.sites as string) ?? 'facebook,twitter,wechat,weibo,qq',
    },
    addtoany: {
      enable: (addtoany?.enable as boolean) ?? false,
      item: (addtoany?.item as string) ?? 'facebook,twitter,wechat,sina_weibo,email,copy_link',
    },
  };
}

export function buildMainToneConfig(data: Record<string, unknown>): ConfigState['mainTone'] {
  const d = data.mainTone as Record<string, unknown> | undefined;
  return {
    enable: (d?.enable as boolean) ?? false,
    mode: (d?.mode as 'cdn' | 'api' | 'both') ?? 'api',
  };
}

export function buildFooterConfig(data: Record<string, unknown>): ConfigState['footer'] {
  const d = data.footer as Record<string, unknown> | undefined;
  const owner = d?.owner as Record<string, unknown> | undefined;
  const runtime = d?.runtime as Record<string, unknown> | undefined;
  return {
    owner: {
      enable: (owner?.enable as boolean) ?? false,
      since: (owner?.since as number) ?? 2020,
    },
    customText: (d?.customText as string) ?? '',
    runtime: {
      enable: (runtime?.enable as boolean) ?? false,
      launchTime: (runtime?.launchTime as string) ?? '04/01/2021 00:00:00',
    },
  };
}

export function buildConfigState(data: Record<string, unknown>): ConfigState {
  return {
    site: buildSiteConfig(data),
    appearance: buildAppearanceConfig(data),
    access: buildAccessConfig(data),
    auth: buildAuthConfig(data),
    nav: buildNavConfig(data),
    mourn: buildMournConfig(data),
    highlight: buildHighlightConfig(data),
    copy: buildCopyConfig(data),
    social: buildSocialConfig(data),
    authorStatus: buildAuthorStatusConfig(data),
    cover: buildCoverConfig(data),
    errorImg: buildErrorImgConfig(data),
    postMeta: buildPostMetaConfig(data),
    wordcount: buildWordCountConfig(data),
    toc: buildTocConfig(data),
    copyright: buildCopyrightConfig(data),
    reward: buildRewardConfig(data),
    postEdit: buildPostEditConfig(data),
    share: buildShareConfig(data),
    mainTone: buildMainToneConfig(data),
    footer: buildFooterConfig(data),
    users: (data.users as Record<string, UserConfig>) || {},
  };
}
