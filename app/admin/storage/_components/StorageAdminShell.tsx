/**
 * /admin/storage 顶层 client 组件
 *
 * - 调用 useStorageState 拿到全量状态
 * - 组合左侧文件夹树 + 右侧文件网格 + 顶部工具栏
 * - 串接对话框(上传/创建/删除/设置)
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Database, FolderPlus, RotateCw, Upload } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { showError } from '@/lib/error';
import { Button } from '@/components/ui/Button';
import { ProCard } from '@/components/ui/ProCard';
import { PageContainer } from '@/components/ui/PageContainer';
import { useStorageState } from '../_lib/use-storage-state';
import { splitPath } from '../_lib/format';
import { StorageNotConfiguredBanner } from './StorageNotConfiguredBanner';
import { StorageBreadcrumb } from './StorageBreadcrumb';
import { StorageFolderTree } from './StorageFolderTree';
import { StorageFileGrid } from './StorageFileGrid';
import { StorageUploadDialog } from './StorageUploadDialog';
import { StorageMkdirDialog } from './StorageMkdirDialog';
import { StorageConfirmDeleteDialog } from './StorageConfirmDeleteDialog';
import { StorageFolderSettingsPopover } from './StorageFolderSettingsPopover';
import type { WebDavEntry } from '@/lib/storage/types';

const APP_URL_FALLBACK = '';

function getAppUrl(): string {
  // 优先 window.location.origin,其次 APP_URL,最后空
  if (typeof window !== 'undefined') {
    return `${window.location.origin}`;
  }
  return APP_URL_FALLBACK;
}

export function StorageAdminShell() {
  const { t } = useI18n();
  const state = useStorageState();
  const [appUrl, setAppUrl] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setAppUrl(getAppUrl());
  }, []);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await state.loadEntries(state.currentPath);
    } finally {
      setRefreshing(false);
    }
  };

  // 当前选中文件夹元数据
  const currentFolder = useMemo(() => {
    if (!state.currentPath) return null;
    const segments = splitPath(state.currentPath);
    if (segments.length === 0) return null;
    const topLevel = segments[0];
    return state.folders.find((f) => f.path === topLevel) ?? null;
  }, [state.currentPath, state.folders]);

  // i18n 字符串(集中获取,避免内联表达式污染 JSX)
  const labels = {
    title: t('storage.title'),
    folders: t('storage.folders'),
    root: t('storage.root'),
    newFolder: t('storage.newFolder'),
    upload: t('storage.upload'),
    copyUrl: t('storage.copyUrl'),
    urlCopied: t('storage.urlCopied'),
    public: t('storage.public'),
    private: t('storage.private'),
    publicDesc: t('storage.publicDesc'),
    privateDesc: t('storage.privateDesc'),
    settingsTitle: t('storage.currentFolder'),
    notApplicableHint: t('storage.privateDesc'),
    delete: t('storage.delete'),
    deleteFile: t('storage.deleteFileConfirm'),
    deleteFolder: t('storage.deleteFolderConfirm'),
    deleteDesc: t('storage.deleteConfirmDesc'),
    cancel: t('storage.cancel'),
    create: t('storage.create'),
    folderNameLabel: t('storage.folderName'),
    folderNamePlaceholder: t('storage.folderNamePlaceholder'),
    empty: t('storage.empty'),
    noFiles: t('storage.noFiles'),
    noFilesHint: t('storage.noFilesHint'),
    loadFailed: t('storage.loadFailed'),
    refresh: t('storage.refresh'),
    settingsUpdated: t('storage.settingsUpdated'),
    passwordLabel: t('storage.passwordLabel'),
    passwordHint: t('storage.passwordHint'),
    passwordPlaceholder: t('storage.passwordPlaceholder'),
    hasPassword: t('storage.hasPassword'),
    noPassword: t('storage.noPassword'),
    setPassword: t('storage.setPassword'),
    clearPassword: t('common.delete'),
    confirmClear: t('common.confirm'),
  };

  const handleEntryDelete = (entry: WebDavEntry) => {
    if (!state.configured) {
      showError('WebDAV 未配置,无法删除');
      return;
    }
    if (entry.isDirectory) {
      state.openDialog('delete-folder', entry.basename);
    } else {
      state.openDialog('delete-file', entry.basename);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!state.pendingTarget) return;
    if (state.dialog === 'delete-file') {
      const full = state.currentPath
        ? `${state.currentPath}/${state.pendingTarget}`
        : state.pendingTarget;
      await state.removeFile(full);
    } else if (state.dialog === 'delete-folder') {
      // pendingTarget 为目录完整 basename 路径(顶层)
      const full = state.currentPath
        ? `${state.currentPath}/${state.pendingTarget}`
        : state.pendingTarget;
      await state.removeFolder(full);
    }
  };

  const handleTogglePublic = async (next: boolean) => {
    if (!currentFolder) return;
    await state.toggleFolderPublic(currentFolder.path, next);
  };

  const handleSetPassword = async (password: string): Promise<boolean> => {
    if (!currentFolder) return false;
    const meta = await state.setFolderPassword(currentFolder.path, password);
    return meta !== null;
  };

  const handleClearPassword = async (): Promise<boolean> => {
    if (!currentFolder) return false;
    const meta = await state.setFolderPassword(currentFolder.path, null);
    return meta !== null;
  };

  // 加载态
  if (state.loading) {
    return (
      <PageContainer maxWidth="6xl">
        <div className="py-32 text-center text-zinc-400 text-sm">加载中…</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="6xl">
      {/* 顶部标题 */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
            <Database size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{labels.title}</h1>
            <p className="text-zinc-400 text-sm">
              {state.folders.length} {labels.folders}
            </p>
          </div>
        </div>
        <Button
          variant="default"
          size="sm"
          icon={<RotateCw size={14} className={refreshing ? 'animate-spin' : ''} />}
          onClick={handleRefresh}
          disabled={refreshing || !state.configured}
        >
          {labels.refresh}
        </Button>
      </div>

      {/* 降级提示 */}
      {!state.configured && <StorageNotConfiguredBanner />}

      {/* 错误提示(非 NOT_CONFIGURED) */}
      {state.error && state.configured && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm flex items-center justify-between">
          <span>{state.error}</span>
          <button
            type="button"
            onClick={() => void state.refreshAll()}
            className="text-xs underline hover:no-underline"
          >
            {labels.refresh}
          </button>
        </div>
      )}

      {/* 主内容:左右两栏 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* 左侧文件夹树 */}
        <div className="md:col-span-3">
          <ProCard
            padding="p-0"
            className="h-[calc(100vh-280px)] min-h-[400px] flex flex-col overflow-hidden"
          >
            <StorageFolderTree
              folders={state.folders}
              currentPath={state.currentPath}
              rootLabel={labels.root}
              publicLabel={labels.public}
              privateLabel={labels.private}
              onNavigate={state.navigateTo}
              onNewFolder={() => state.openDialog('mkdir')}
              disabled={!state.configured}
            />
          </ProCard>
        </div>

        {/* 右侧文件列表 */}
        <div className="md:col-span-9">
          <ProCard padding="p-0">
            {/* 顶部工具栏 */}
            <div className="px-4 py-3 border-b border-zinc-100 flex flex-wrap items-center gap-3 justify-between">
              <StorageBreadcrumb
                currentPath={state.currentPath}
                rootLabel={labels.root}
                onNavigate={state.navigateTo}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <StorageFolderSettingsPopover
                  currentPath={state.currentPath}
                  currentFolder={currentFolder}
                  publicLabel={labels.public}
                  privateLabel={labels.private}
                  publicDesc={labels.publicDesc}
                  privateDesc={labels.privateDesc}
                  settingsTitle={labels.settingsTitle}
                  notApplicableHint={labels.notApplicableHint}
                  passwordLabel={labels.passwordLabel}
                  passwordHint={labels.passwordHint}
                  passwordPlaceholder={labels.passwordPlaceholder}
                  hasPasswordLabel={labels.hasPassword}
                  noPasswordLabel={labels.noPassword}
                  setPasswordLabel={labels.setPassword}
                  clearPasswordLabel={labels.clearPassword}
                  confirmClearTitle={labels.confirmClear}
                  okLabel={labels.confirmClear}
                  cancelLabel={labels.cancel}
                  onToggle={handleTogglePublic}
                  onSetPassword={handleSetPassword}
                  onClearPassword={handleClearPassword}
                  disabled={!state.configured}
                />
                <Button
                  variant="default"
                  size="sm"
                  icon={<FolderPlus size={14} />}
                  onClick={() => state.openDialog('mkdir')}
                  disabled={!state.configured}
                  title={!state.configured ? 'WebDAV 未配置' : labels.newFolder}
                >
                  {labels.newFolder}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Upload size={14} />}
                  onClick={() => state.openDialog('upload')}
                  disabled={!state.configured}
                  title={!state.configured ? 'WebDAV 未配置' : labels.upload}
                >
                  {labels.upload}
                </Button>
              </div>
            </div>

            {/* 文件网格 */}
            <div className="p-4">
              <StorageFileGrid
                entries={state.entries}
                loading={state.loading}
                appUrl={appUrl}
                currentPath={state.currentPath}
                copyUrlLabel={labels.copyUrl}
                copiedLabel={labels.urlCopied}
                deleteLabel={labels.delete}
                refreshLabel={labels.refresh}
                noFilesLabel={labels.noFiles}
                noFilesHint={labels.noFilesHint}
                onNavigate={state.navigateTo}
                onDelete={handleEntryDelete}
                onRefresh={() => void state.refreshAll()}
                disabled={!state.configured}
              />
            </div>
          </ProCard>
        </div>
      </div>

      {/* 对话框 */}
      <StorageUploadDialog
        open={state.dialog === 'upload'}
        currentPath={state.currentPath}
        uploadLabel={labels.upload}
        cancelLabel={labels.cancel}
        fileTooLargeLabel={labels.delete}
        emptyHint={labels.noFiles}
        rootLabel={labels.root}
        onCancel={state.closeDialog}
        onUpload={state.uploadFiles}
        disabled={!state.configured}
      />

      <StorageMkdirDialog
        open={state.dialog === 'mkdir'}
        currentPath={state.currentPath}
        title={labels.newFolder}
        nameLabel={labels.folderNameLabel}
        namePlaceholder={labels.folderNamePlaceholder}
        createLabel={labels.create}
        cancelLabel={labels.cancel}
        rootLabel={labels.root}
        onCancel={state.closeDialog}
        onCreate={state.createFolder}
        disabled={!state.configured}
      />

      <StorageConfirmDeleteDialog
        open={state.dialog === 'delete-file' || state.dialog === 'delete-folder'}
        target={state.pendingTarget}
        isFolder={state.dialog === 'delete-folder'}
        titleLabel={labels.deleteFile}
        folderTitleLabel={labels.deleteFolder}
        descLabel={labels.deleteDesc}
        cancelLabel={labels.cancel}
        deleteLabel={labels.delete}
        onCancel={state.closeDialog}
        onConfirm={handleDeleteConfirm}
        disabled={!state.configured}
      />
    </PageContainer>
  );
}

export default StorageAdminShell;
