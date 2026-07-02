'use client';

// 标签与受理人区块
import { useI18n } from '@/hooks/use-i18n';
import { TagInputRow } from './TagInputRow';

interface LabelsAssigneesSectionProps {
  labelInput: string;
  onLabelInputChange: (v: string) => void;
  onAddLabel: () => void;
  onRemoveLabel: (l: string) => void;
  labels: string[];
  assigneeInput: string;
  onAssigneeInputChange: (v: string) => void;
  onAddAssignee: () => void;
  onRemoveAssignee: (a: string) => void;
  assignees: string[];
}

export function LabelsAssigneesSection({
  labelInput, onLabelInputChange, onAddLabel, onRemoveLabel, labels,
  assigneeInput, onAssigneeInputChange, onAddAssignee, onRemoveAssignee, assignees,
}: LabelsAssigneesSectionProps) {
  const { t } = useI18n();
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-6 mb-4">
      <h2 className="text-base font-bold text-zinc-900 mb-4">
        {t('tickets.labels')}与{t('tickets.assignees')}
      </h2>
      <div className="mb-4">
        <TagInputRow
          label={t('tickets.labels')}
          inputValue={labelInput}
          onInputChange={onLabelInputChange}
          onSubmit={onAddLabel}
          placeholder={t('tickets.enterLabel')}
          addButtonLabel={t('tickets.add')}
          items={labels}
          onRemove={onRemoveLabel}
        />
      </div>
      <TagInputRow
        label={t('tickets.assignees')}
        inputValue={assigneeInput}
        onInputChange={onAssigneeInputChange}
        onSubmit={onAddAssignee}
        placeholder={t('tickets.username')}
        addButtonLabel={t('tickets.add')}
        items={assignees}
        onRemove={onRemoveAssignee}
      />
    </div>
  );
}
