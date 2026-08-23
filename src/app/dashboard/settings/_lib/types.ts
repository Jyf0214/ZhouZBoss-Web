import type { Rule } from 'antd/es/form';
import type { ReactNode } from 'react';

// 表单字段类型（与 antd Form 表单值一致）
export interface SettingsFormValues {
  avatarUrl: string;
  username: string;
  displayName: string;
}

// 单个表单字段组件 Props
export interface SettingsFormFieldProps {
  name: string;
  label: string;
  icon: ReactNode;
  placeholder?: string;
  extra?: string;
  rules?: Rule[];
  children?: ReactNode;
}

// 用户卡片数据
export interface UserCardData {
  name: string;
  displayName: string;
  email: string;
  avatarUrl: string;
}

// /api/config 接口返回结构
export interface RemoteConfigData {
  githubConfigured?: boolean;
  _remoteConfig?: string;
  _remoteConfigStatus?: string;
  _remoteConfigError?: string;
  avatar?: { url?: string };
}
