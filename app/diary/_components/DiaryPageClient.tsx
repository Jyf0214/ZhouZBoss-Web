'use client';

import { useState } from 'react';
import { Plus, Settings, ShieldAlert, FileText, Loader2 } from 'lucide-react';
import { GlobalLoading } from '@/components/Loading';
import { PageContainer } from '@/components/ui/PageContainer';
import { EmptyState } from '@/components/ui/EmptyState';
import { HeroBanner } from '@/components/ui/HeroBanner';
import { Button } from '@/components/ui/Button';
import { useDiaryState } from './use-diary-state';
import { DiaryFilters, GroupTabs } from './DiaryFilters';
import { DiaryCard } from './DiaryCard';
import { DiarySettingsPanel } from './DiarySettingsPanel';
import { SecurityInfoModal } from './SecurityInfoModal';
import { VersionHistoryModal } from './VersionHistoryModal';

export function DiaryPageClient() {
  const s = useDiaryState();
  const [showSettings, setShowSettings] = useState(false);
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);
  const [versionHistoryDiaryId, setVersionHistoryDiaryId] = useState<string | null>(null);

  if (s.authLoading || (s.loading && s.diaries.length === 0 && !s.isAuthorized)) {
    return <GlobalLoading />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <PageContainer maxWidth="4xl" padding="compact">
        <HeroBanner
          title="日记"
          description="安全 · 隐私 · 加密存储"
          tips="管理员"
          align="left"
          size="compact"
          buttons={[
            {
              label: '新建日记',
              variant: 'primary',
              icon: <Plus size={16} />,
              onClick: () => s.router.push('/diary/new'),
            },
          ]}
          className="mb-6 sm:mb-8"
        />

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
          <Button
            variant={showSettings ? 'primary' : 'secondary'}
            size="md"
            onClick={() => setShowSettings(!showSettings)}
            icon={<Settings size={14} />}
            title="日记设置"
          >
            <span className="hidden sm:inline">设置</span>
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => s.router.push('/diary/drafts')}
            icon={<FileText size={14} />}
          >
            <span className="hidden sm:inline">草稿箱</span>
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => setShowSecurityInfo(true)}
            icon={<ShieldAlert size={14} />}
            className="text-amber-600 hover:bg-amber-50"
            title="安全与隐私说明"
          >
            <span className="hidden sm:inline">安全与隐私</span>
          </Button>
        </div>

        <DiaryFilters
          searchText={s.searchText}
          setSearchText={s.setSearchText}
          startDate={s.startDate}
          setStartDate={s.setStartDate}
          endDate={s.endDate}
          setEndDate={s.setEndDate}
        />

        <GroupTabs
          groups={s.groups}
          activeGroup={s.activeGroup}
          onSelect={s.setActiveGroup}
        />

        {showSettings && (
          <DiarySettingsPanel
            exportLoading={s.exportLoading}
            onExport={s.handleExport}
          />
        )}

        {s.loading ? (
          <div className="flex items-center justify-center py-24 sm:py-32">
            <Loader2 size={24} className="sm:size-8 text-zinc-300 animate-spin" />
          </div>
        ) : s.diaries.length === 0 ? (
          <EmptyState
            description="暂无日记"
            action={
              <Button
                variant="primary"
                size="lg"
                onClick={() => s.router.push('/diary/new')}
                icon={<Plus size={18} />}
              >
                写下第一篇日记
              </Button>
            }
          />
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {s.diaries.map((d) => (
              <DiaryCard
                key={d.id}
                diary={d}
                viewingId={s.viewingId}
                viewContent={s.viewContent}
                viewLoading={s.viewLoading}
                deleting={s.deleting}
                pinning={s.pinning}
                onView={s.handleView}
                onTogglePin={s.handleTogglePin}
                onEdit={(id) => s.router.push(`/diary/${id}/edit`)}
                onDelete={s.handleDelete}
                onVersionHistory={(id) => setVersionHistoryDiaryId(id)}
              />
            ))}
          </div>
        )}
      </PageContainer>

      {showSecurityInfo && <SecurityInfoModal onClose={() => setShowSecurityInfo(false)} />}
      {versionHistoryDiaryId && (
        <VersionHistoryModal
          open
          diaryId={versionHistoryDiaryId}
          onClose={() => setVersionHistoryDiaryId(null)}
        />
      )}
    </div>
  );
}
