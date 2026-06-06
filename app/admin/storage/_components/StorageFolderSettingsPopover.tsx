/**
 * 文件夹公开/私有切换面板
 *
 * - 选中根目录或无元数据时返回 null(根目录不允许配置)
 * - 通过 callback 触发 patch
 * - 私有文件夹额外展示密码设置子组件
 */
'use client';

import { Popover } from 'antd';
import { Settings2 } from 'lucide-react';
import type { StorageFolderMetaWithPassword } from '../_lib/types';
import ToggleField from '@/components/ui/ToggleField';
import { StorageFolderPasswordSection } from './StorageFolderPasswordSection';

interface Props {
  currentPath: string;
  currentFolder: StorageFolderMetaWithPassword | null;
  publicLabel: string;
  privateLabel: string;
  publicDesc: string;
  privateDesc: string;
  settingsTitle: string;
  notApplicableHint: string;
  passwordLabel: string;
  passwordHint: string;
  passwordPlaceholder: string;
  hasPasswordLabel: string;
  noPasswordLabel: string;
  setPasswordLabel: string;
  clearPasswordLabel: string;
  confirmClearTitle: string;
  okLabel: string;
  cancelLabel: string;
  onToggle: (next: boolean) => void;
  onSetPassword: (password: string) => Promise<boolean>;
  onClearPassword: () => Promise<boolean>;
  disabled?: boolean;
}

export function StorageFolderSettingsPopover({
  currentPath,
  currentFolder,
  publicLabel,
  privateLabel,
  publicDesc,
  privateDesc,
  settingsTitle,
  notApplicableHint,
  passwordLabel,
  passwordHint,
  passwordPlaceholder,
  hasPasswordLabel,
  noPasswordLabel,
  setPasswordLabel,
  clearPasswordLabel,
  confirmClearTitle,
  okLabel,
  cancelLabel,
  onToggle,
  onSetPassword,
  onClearPassword,
  disabled = false,
}: Props) {
  if (!currentPath) {
    return (
      <span className="text-xs text-zinc-400 italic">{notApplicableHint}</span>
    );
  }

  if (!currentFolder) {
    return (
      <span className="text-xs text-zinc-400 italic">{notApplicableHint}</span>
    );
  }

  const isPrivate = !currentFolder.public;

  const content = (
    <div className="w-80 space-y-2">
      <div className="text-xs font-semibold text-zinc-900 px-1">{settingsTitle}</div>
      <ToggleField
        label={currentFolder.public ? publicLabel : privateLabel}
        description={currentFolder.public ? publicDesc : privateDesc}
        checked={currentFolder.public}
        onChange={onToggle}
      />
      {isPrivate && (
        <StorageFolderPasswordSection
          hasPassword={!!currentFolder.hasPassword}
          passwordLabel={passwordLabel}
          passwordHint={passwordHint}
          passwordPlaceholder={passwordPlaceholder}
          hasPasswordLabel={hasPasswordLabel}
          noPasswordLabel={noPasswordLabel}
          setPasswordLabel={setPasswordLabel}
          clearPasswordLabel={clearPasswordLabel}
          confirmClearTitle={confirmClearTitle}
          okLabel={okLabel}
          cancelLabel={cancelLabel}
          disabled={disabled}
          onSetPassword={onSetPassword}
          onClearPassword={onClearPassword}
        />
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      placement="bottomRight"
      destroyTooltipOnHide
    >
      <button
        type="button"
        disabled={disabled}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Settings2 size={12} />
        {currentFolder.public ? publicLabel : privateLabel}
      </button>
    </Popover>
  );
}

export default StorageFolderSettingsPopover;
