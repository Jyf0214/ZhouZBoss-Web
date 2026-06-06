export interface PostItem {
  slug: string;
  title: string;
  date?: string;
  author?: string;
  tags: string[];
  cover?: string;
  description?: string;
  pinned?: boolean;
}

export interface GroupItem {
  slug: string;
  title: string;
  description?: string;
  public: boolean;
  groupName?: string;
}

export interface CoverConfig {
  indexEnable?: boolean;
  asideEnable: boolean;
  position: string;
}

export interface PostListClientProps {
  posts: PostItem[];
  groups: GroupItem[];
  coverConfig?: CoverConfig;
}
