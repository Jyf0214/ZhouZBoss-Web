// 字段类型下拉选项配置
export const FIELD_TYPES: readonly { value: string; labelKey: string }[] = [
  { value: 'input', labelKey: 'tickets.typeText' },
  { value: 'textarea', labelKey: 'tickets.typeTextarea' },
  { value: 'dropdown', labelKey: 'tickets.typeSelect' },
  { value: 'checkboxes', labelKey: 'tickets.typeSelect' },
];
