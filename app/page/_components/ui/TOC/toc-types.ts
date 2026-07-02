// TOC 相关类型定义

export interface TOCConfig {
  number?: boolean;
  expand?: boolean;
  styleSimple?: boolean;
}

export interface TOCProps {
  content: string;
  config?: TOCConfig;
  locale?: string;
}

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

export interface TocNode {
  id: string;
  text: string;
  level: number;
  children: TocNode[];
}

export interface TocItemProps {
  items: TocNode[];
  activeId: string;
  depth?: number;
  numbering?: boolean;
  prefix?: string;
  onLinkClick?: () => void;
}
