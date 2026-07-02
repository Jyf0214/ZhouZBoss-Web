'use client';

import { PageContainer } from '@/components/ui/PageContainer';
import { useTicketTemplateForm } from './_lib/use-ticket-template-form';
import { AccessDenied, PageHeader, BasicInfoSection, FormFieldsSection, LabelsAssigneesSection, MarkdownBodySection, ActionButtons } from './_components';

export default function NewTicketTemplatePage() {
  const f = useTicketTemplateForm();
  if (f.userRole !== 'sudo' && f.userRole !== 'admin') return <AccessDenied />;
  return (
    <PageContainer maxWidth="4xl">
      <PageHeader />
      <BasicInfoSection nameValue={f.name} onNameChange={f.setName} descValue={f.description} onDescChange={f.setDescription} titleFormatValue={f.titleFormat} onTitleFormatChange={f.setTitleFormat} />
      <FormFieldsSection fields={f.fields} onAdd={f.addField} onRemove={f.removeField} onUpdate={f.updateField} />
      <LabelsAssigneesSection labelInput={f.labelInput} onLabelInputChange={f.setLabelInput} onAddLabel={f.addLabel} onRemoveLabel={f.removeLabel} labels={f.labels} assigneeInput={f.assigneeInput} onAssigneeInputChange={f.setAssigneeInput} onAddAssignee={f.addAssignee} onRemoveAssignee={f.removeAssignee} assignees={f.assignees} />
      <MarkdownBodySection showPreview={f.showPreview} onTogglePreview={f.togglePreview} body={f.body} onBodyChange={f.setBody} previewContent={f.generateMarkdown()} />
      <ActionButtons onCancel={f.cancel} onSubmit={f.handleSave} saving={f.saving} />
    </PageContainer>
  );
}
