export interface PostItem {
  slug: string;
  title: string;
  date?: string;
  author?: string;
  tags: string[];
  cover?: string;
  description?: string;
  pinned?: boolean;
  /** 预估阅读时间（分钟） */
  readingTime?: number;
}

export interface CoverConfig {
  indexEnable?: boolean;
  asideEnable: boolean;
  position: string;
}

export interface HomePostGridProps {
  posts: PostItem[];
  heroTitleLine1?: string;
  heroTitleLine2?: string;
  defaultCover?: string;
  coverConfig?: CoverConfig;
}
