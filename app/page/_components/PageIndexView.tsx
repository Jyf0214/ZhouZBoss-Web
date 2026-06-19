'use client';

/**
 * /page 索引页 — 客户端视图组件
 *
 * 与 app/page/page.tsx(服务端)配对:服务端只负责读取 WebDAV/DB,
 * 把结果以 props 传入本组件,由本组件负责 i18n 渲染与交互。
 */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Globe, Folder, Lock, FileCode, Plus, FolderOpen, RotateCw, Copy } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { useAuth } from '@/hooks/use-auth';
import Sidebar from '@/components/Sidebar/index';
import TopHeader from '@/components/TopHeader';
import { Button } from '@/components/ui/Button';
import { CreatePageDialog } from './CreatePageDialog';
import { CopyPageDialog } from './CopyPageDialog';
import { EditPageMetaDialog } from './EditPageMetaDialog';

export interface PageIndexItem {
  href: string;
  filename: string;
  folder: string;
  title: string;
  isPrivate: boolean;
  /** 同目录下存储池中有但未显示的文件数 */
  hiddenCount?: number;
  /** 页面描述 */
  description?: string;
  /** 封面图 URL */
  coverImage?: string;
  /** 标签列表 */
  tags?: string[];
  /** 创建时间 */
  createdAt?: string;
  /** 更新时间 */
  updatedAt?: string;
}

/**
 * 存储池中存在但未在索引中显示的条目
 */
export interface StorageOrphan {
  relativePath: string;
  /** 未显示的原因: depth(超 2 层) / notHtml(非 .html 后缀) / failure(读取失败) */
  reason: 'depth' | 'notHtml' | 'failure';
}

interface PageIndexViewProps {
  notConfigured: boolean;
  pages: PageIndexItem[];
  emptyDirs: string[];
  orphans?: StorageOrphan[];
}

export function PageIndexView({ notConfigured, pages, emptyDirs, orphans: _orphans = [] }: PageIndexViewProps) {
  const { t } = useI18n();
  const { isSudo } = useAuth();
  const router = useRouter();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [copyPage, setCopyPage] = useState<PageIndexItem | null>(null);
  const [editMetaPage, setEditMetaPage] = useState<PageIndexItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleEditMeta = (page: PageIndexItem) => {
    setEditMetaPage(page);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar variant="user" />
      <div className="flex-1 flex flex-col md:ml-[280px] min-h-screen bg-zinc-50">
        <TopHeader />
        <main className="flex-1 p-6 md:p-10">
          <div className="max-w-5xl mx-auto">
            <header className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
                  <Globe size={20} aria-hidden />
                </span>
                <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">
                  {t('page.indexTitle')}
                </h1>
              </div>
              <p className="text-sm text-zinc-500 leading-relaxed max-w-2xl">
                {notConfigured ? t('page.notConfiguredDesc') : t('page.indexSubtitle')}
              </p>
            </header>

            {/* 管理员操作：刷新 + 新建页面 */}
            {isSudo && (
              <div className="flex justify-end gap-2 mb-4">
                <Button
                  variant="default"
                  size="sm"
                  icon={<RotateCw size={14} className={refreshing ? 'animate-spin' : ''} />}
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  {t('common.refresh')}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus size={16} />}
                  onClick={() => setShowCreateDialog(true)}
                >
                  新建页面
                </Button>
              </div>
            )}

            {notConfigured ? (
              <NotConfiguredCard />
            ) : pages.length === 0 && emptyDirs.length === 0 ? (
              <EmptyCard />
            ) : (
              <>
                {pages.length > 0 && <PageGrid pages={pages} isSudo={isSudo} onEditMeta={handleEditMeta} onCopy={(page) => setCopyPage(page)} />}
                {emptyDirs.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-zinc-500 mb-3">空文件夹（尚未添加页面文件）</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {emptyDirs.map((dir) => (
                        <Link
                          key={dir}
                          href={`/admin/storage`}
                          className="group block rounded-2xl bg-white p-5 ring-1 ring-amber-200/60 bg-amber-50/30 hover:ring-amber-400 transition-all duration-200 no-underline"
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                              <FolderOpen size={18} aria-hidden />
                            </div>
                          </div>
                          <h3 className="text-base font-semibold text-zinc-900 mb-1">{dir}</h3>
                          <p className="text-xs text-amber-600">点击前往文件管理页上传文件</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* 新建页面弹窗 */}
      <CreatePageDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={() => router.refresh()}
      />

      {/* 复制页面弹窗 */}
      <CopyPageDialog
        open={!!copyPage}
        sourcePage={copyPage ? { title: copyPage.title, folder: copyPage.folder, filename: copyPage.filename } : null}
        onClose={() => setCopyPage(null)}
        onCopied={() => router.refresh()}
      />

      {/* 编辑元数据弹窗 */}
      {editMetaPage && (
        <EditPageMetaDialog
          open={!!editMetaPage}
          page={{ filename: editMetaPage.filename, folder: editMetaPage.folder }}
          onClose={() => setEditMetaPage(null)}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}

function NotConfiguredCard() {
  return (
    <div className="rounded-2xl bg-white p-8 ring-1 ring-amber-200/60 bg-amber-50/30">
      <div className="flex items-center gap-3 text-amber-700 font-semibold mb-3">
        <Folder size={20} aria-hidden />
        <span>存储后端未配置</span>
      </div>
      <p className="text-sm text-zinc-600 leading-relaxed mb-4">
        页面索引依赖存储后端读取 <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">pages/</code> 目录下的 HTML 文件。
        请在环境变量中配置以下之一:
      </p>
      <ul className="text-sm text-zinc-600 leading-relaxed mb-4 ml-4 list-disc space-y-1">
        <li>
          <strong>WebDAV:</strong> <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">WEBDAV_URL</code> /
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs"> WEBDAV_USER</code> /
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs"> WEBDAV_PASS</code>
        </li>
        <li>
          <strong>Backblaze B2:</strong> <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">B2_KEY_ID</code> /
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs"> B2_APP_KEY</code> /
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs"> B2_BUCKET</code>
          {' + '}<code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">STORAGE_TYPE=backblaze</code>
        </li>
      </ul>
      <p className="text-xs text-zinc-500">
        配置完成后,在 <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">pages/</code> 目录下放置
        <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">.html</code> 文件即可在此列出。
      </p>
    </div>
  );
}

function EmptyCard() {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl bg-white p-10 ring-1 ring-zinc-200 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
        <FileCode size={22} aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-zinc-900 mb-2">{t('page.indexEmpty')}</h2>
      <p className="text-sm text-zinc-500 leading-relaxed max-w-md mx-auto">
        {t('page.indexEmptyHint')}
      </p>
    </div>
  );
}

function PageGrid({ pages, isSudo, onEditMeta, onCopy }: { pages: PageIndexItem[]; isSudo: boolean; onEditMeta: (page: PageIndexItem) => void; onCopy: (page: PageIndexItem) => void }) {
  const { t } = useI18n();
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {pages.map(page => (
        <li key={page.href}>
          <Link
            href={page.href}
            className="group block h-full rounded-2xl bg-white p-5 ring-1 ring-zinc-200 hover:ring-zinc-900 hover:shadow-lg hover:shadow-zinc-200/50 transition-all duration-200 no-underline"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                <FileCode size={18} aria-hidden />
              </div>
              <div className="flex items-center gap-1.5">
                {page.hiddenCount && page.hiddenCount > 0 ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-orange-700 tracking-wider ring-1 ring-orange-200/60"
                    title={`存储池中有 ${page.hiddenCount} 个文件未部署`}
                  >
                    +{page.hiddenCount}
                  </span>
                ) : null}
                {page.isPrivate ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 uppercase tracking-wider ring-1 ring-amber-200/60">
                    <Lock size={10} aria-hidden />
                    {t('page.indexPrivateBadge')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 uppercase tracking-wider ring-1 ring-emerald-200/60">
                    {t('page.indexPublicBadge')}
                  </span>
                )}
              </div>
            </div>
            <h3
              className="text-base font-semibold text-zinc-900 mb-1 truncate"
              title={page.title}
            >
              {page.title}
            </h3>
            <p
              className="text-xs text-zinc-400 font-mono truncate"
              title={page.folder ? `${page.folder}/${page.filename}` : page.filename}
            >
              {page.folder ? `${page.folder}/${page.filename}` : page.filename}
            </p>
          </Link>
          {isSudo && (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCopy(page); }}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
              >
                <Copy size={12} aria-hidden />
                复制
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEditMeta(page); }}
                className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
              >
                编辑元数据
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
