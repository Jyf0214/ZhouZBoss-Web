'use client';

import { Check } from 'lucide-react';
import {
  PERMISSION_GROUPS,
  type ApiKeyPermissions,
  type PermissionAction,
  type CustomPagesPermission,
} from '@/lib/api-key-permissions';

export interface StorageFolderItem {
  path: string;
  public: boolean;
}

interface PermissionsEditorProps {
  permissions: ApiKeyPermissions;
  onChange: (p: ApiKeyPermissions) => void;
  folders: StorageFolderItem[];
  className?: string;
}

export function PermissionsEditor({ permissions, onChange, folders, className = '' }: PermissionsEditorProps) {
  const toggleAction = (action: PermissionAction) => {
    onChange({
      ...permissions,
      actions: { ...permissions.actions, [action]: !permissions.actions[action] },
    });
  };

  const allActionsEnabled = Object.values(permissions.actions).every(Boolean);
  const toggleAll = () => {
    const next = !allActionsEnabled;
    const newActions = Object.fromEntries(
      Object.keys(permissions.actions).map(k => [k, next])
    ) as Record<PermissionAction, boolean>;
    onChange({ ...permissions, actions: newActions });
  };

  return (
    <div className={className}>
      {/* 操作权限 */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-zinc-600 uppercase tracking-wide">操作权限</p>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
        >
          {allActionsEnabled ? '全部禁用' : '全部启用'}
        </button>
      </div>
      <div className="space-y-3">
        {PERMISSION_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-[11px] font-medium text-zinc-400 mb-1.5">{group.label}</p>
            <div className="flex flex-wrap gap-2">
              {group.actions.map(action => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => toggleAction(action.key)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                    permissions.actions[action.key]
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-400'
                  }`}
                >
                  {permissions.actions[action.key]
                    ? <Check size={10} />
                    : <span className="w-2.5 h-2.5 rounded-full border border-zinc-300" />
                  }
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 自定义页面访问控制 */}
      <div className="mt-4 pt-3 border-t border-zinc-100">
        <p className="text-xs font-medium text-zinc-600 uppercase tracking-wide mb-2">自定义页面访问</p>
        <div className="flex gap-2 mb-3">
          {([
            { value: 'all' as const, label: '全部' },
            { value: 'readonly' as const, label: '只读' },
            { value: 'folders' as const, label: '指定文件夹' },
          ]).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                const cp: CustomPagesPermission = {
                  mode: opt.value,
                  allowedFolders: opt.value === 'folders' ? (permissions.customPages?.allowedFolders ?? []) : [],
                };
                onChange({ ...permissions, customPages: opt.value === 'all' ? null : cp });
              }}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                (opt.value === 'all' && !permissions.customPages) ||
                (permissions.customPages?.mode === opt.value)
                  ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-zinc-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 文件夹选择(仅 mode=folders 时显示) */}
        {permissions.customPages?.mode === 'folders' && (
          <div className="space-y-1.5">
            {folders.length === 0 ? (
              <p className="text-xs text-zinc-400">暂无文件夹</p>
            ) : (
              folders.map(f => (
                <label
                  key={f.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    permissions.customPages?.allowedFolders.includes(f.path)
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-zinc-50 border-zinc-100 hover:border-zinc-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={permissions.customPages?.allowedFolders.includes(f.path) ?? false}
                    onChange={() => {
                      if (!permissions.customPages) return;
                      const current = permissions.customPages.allowedFolders;
                      const next = current.includes(f.path)
                        ? current.filter(p => p !== f.path)
                        : [...current, f.path];
                      onChange({
                        ...permissions,
                        customPages: { ...permissions.customPages, allowedFolders: next },
                      });
                    }}
                    className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-zinc-700 font-mono">{f.path || '/'}</span>
                  {f.public && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">公开</span>
                  )}
                </label>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
