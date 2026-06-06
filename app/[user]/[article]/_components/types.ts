export interface ArticleData {
  id: string;
  title: string;
  authorName: string;
  content: string;
  tags: string[];
  coverImage: string;
  createdAt: string;
  status: string;
  category?: string;
}

export interface UserInfo {
  uid: string;
  name: string;
  avatar?: string;
}

export interface PostMetaPostConfig {
  dateType?: string;
  dateFormat?: string;
  categories?: boolean;
  tags?: boolean;
  label?: boolean;
  unread?: boolean;
}
