// 工单模板字段定义类型

export type FieldType = 'input' | 'textarea' | 'dropdown' | 'checkboxes';

// 单个字段定义
export interface TicketFieldDef {
  /** 唯一标识，用于 React key，不持久化 */
  id: string;
  name: string;
  label: string;
  type: string;
  options: string[];
  required: boolean;
}

// 模板基础信息
export interface TicketTemplateForm {
  name: string;
  description: string;
  titleFormat: string;
  labels: string[];
  assignees: string[];
  fields: TicketFieldDef[];
  body: string;
}
