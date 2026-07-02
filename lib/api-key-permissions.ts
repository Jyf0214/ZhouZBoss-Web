/**
 * API 密钥细粒度权限系统
 *
 * 设计原则:
 * - null/undefined 权限 = 全部权限(向后兼容旧密钥)
 * - Cookie 认证(浏览器)不受权限限制
 * - 仅 API 密钥认证时检查权限
 */
import type { SessionPayload } from '@/lib/auth';

/* ---------- 权限操作类型 ---------- */

/** 所有可授权的操作标识 */
export type PermissionAction =
  // 文章
  | 'posts_read' | 'posts_write' | 'posts_delete'
  // 自定义页面
  | 'pages_read' | 'pages_write' | 'pages_delete'
  // 媒体文件
  | 'media_read' | 'media_write' | 'media_delete'
  // 文件存储
  | 'storage_read' | 'storage_write' | 'storage_delete'
  // 站点设置
  | 'settings_read' | 'settings_write'
  // 统计
  | 'stats_read'
  // 搜索
  | 'search';

/** 操作权限分组(用于 UI 展示) */
export const PERMISSION_GROUPS: {
  label: string;
  actions: { key: PermissionAction; label: string }[];
}[] = [
  {
    label: '文章',
    actions: [
      { key: 'posts_read', label: '查看文章' },
      { key: 'posts_write', label: '创建/编辑文章' },
      { key: 'posts_delete', label: '删除文章' },
    ],
  },
  {
    label: '自定义页面',
    actions: [
      { key: 'pages_read', label: '查看页面' },
      { key: 'pages_write', label: '创建/编辑页面' },
      { key: 'pages_delete', label: '删除页面' },
    ],
  },
  {
    label: '媒体文件',
    actions: [
      { key: 'media_read', label: '查看媒体' },
      { key: 'media_write', label: '上传/编辑媒体' },
      { key: 'media_delete', label: '删除媒体' },
    ],
  },
  {
    label: '文件存储',
    actions: [
      { key: 'storage_read', label: '浏览文件' },
      { key: 'storage_write', label: '上传/创建文件' },
      { key: 'storage_delete', label: '删除文件' },
    ],
  },
  {
    label: '站点设置',
    actions: [
      { key: 'settings_read', label: '查看设置' },
      { key: 'settings_write', label: '修改设置' },
    ],
  },
  {
    label: '统计与搜索',
    actions: [
      { key: 'stats_read', label: '查看统计' },
      { key: 'search', label: '全站搜索' },
    ],
  },
];

/* ---------- 自定义页面访问模式 ---------- */

/** 自定义页面访问控制 */
export interface CustomPagesPermission {
  /** 访问模式: all=全部, readonly=只读, folders=指定文件夹 */
  mode: 'all' | 'readonly' | 'folders';
  /** mode='folders' 时允许访问的文件夹路径列表(StorageFolder.path) */
  allowedFolders: string[];
}

/* ---------- 完整权限结构 ---------- */

export interface ApiKeyPermissions {
  /** 操作级别权限(key → 是否允许) */
  actions: Record<PermissionAction, boolean>;
  /** 自定义页面文件夹级别访问控制(null=不限制) */
  customPages: CustomPagesPermission | null;
}

/* ---------- 默认值 ---------- */

/** 全部权限(新密钥默认值 / 旧密钥兼容) */
function createAllActions(): Record<PermissionAction, boolean> {
  const actions = {} as Record<PermissionAction, boolean>;
  for (const group of PERMISSION_GROUPS) {
    for (const a of group.actions) {
      actions[a.key] = true;
    }
  }
  return actions;
}

export const DEFAULT_PERMISSIONS: ApiKeyPermissions = {
  actions: createAllActions(),
  customPages: null,
};

/** 空权限(全部禁止) */
function createEmptyActions(): Record<PermissionAction, boolean> {
  const actions = {} as Record<PermissionAction, boolean>;
  for (const group of PERMISSION_GROUPS) {
    for (const a of group.actions) {
      actions[a.key] = false;
    }
  }
  return actions;
}

export const EMPTY_PERMISSIONS: ApiKeyPermissions = {
  actions: createEmptyActions(),
  customPages: { mode: 'all', allowedFolders: [] },
};

/* ---------- 权限工具函数 ---------- */

/**
 * 从 JSON 字符串解析权限配置
 * null/undefined/无效 JSON → 返回 null(视为全部权限)
 */
export function parsePermissions(raw: string | null | undefined): ApiKeyPermissions | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // 基本结构校验
    if (!parsed.actions || typeof parsed.actions !== 'object') return null;
    return parsed as unknown as ApiKeyPermissions;
  } catch {
    return null;
  }
}

/**
 * 序列化权限为 JSON 字符串(用于存储)
 */
export function serializePermissions(permissions: ApiKeyPermissions): string {
  return JSON.stringify(permissions);
}

/**
 * 检查会话是否拥有指定操作权限
 *
 * 规则:
 * - Cookie 认证(keyId===null) → 始终通过
 * - API 密钥认证 + 无权限配置 → 全部通过(向后兼容)
 * - API 密钥认证 + 有权限配置 → 检查 actions[action]
 */
export function hasPermission(
  session: SessionPayload,
  action: PermissionAction,
  keyId: string | null,
): boolean {
  // Cookie 认证，不受限制
  if (keyId === null) return true;
  // 无权限配置，全部权限
  if (!session.permissions) return true;
  // 检查具体操作
  return !!session.permissions.actions[action];
}

/**
 * 检查自定义页面访问权限
 *
 * @param keyId API 密钥 ID，null 表示 Cookie 认证
 * @param permissions 权限配置
 * @param folderPath 要访问的文件夹路径
 * @param isWrite 是否为写操作
 * @returns 是否允许
 */
export function checkCustomPageAccess(
  keyId: string | null,
  permissions: ApiKeyPermissions | null | undefined,
  folderPath: string,
  isWrite: boolean,
): boolean {
  // Cookie 认证，不受限制
  if (keyId === null) return true;
  // 无权限配置，全部权限
  if (!permissions) return true;
  // 自定义页面权限未设置，不限制
  if (!permissions.customPages) return true;

  const cp = permissions.customPages;

  switch (cp.mode) {
    case 'all':
      return true;
    case 'readonly':
      return !isWrite;
    case 'folders':
      if (isWrite) {
        // 写操作需要 pages_write 权限 + 文件夹在允许列表中
        return !!permissions.actions.pages_write
          && cp.allowedFolders.some(f => folderPath === f || folderPath.startsWith(`${f}/`));
      }
      // 读操作只需要文件夹在允许列表中
      return cp.allowedFolders.some(f => folderPath === f || folderPath.startsWith(`${f}/`));
    default:
      return false;
  }
}
