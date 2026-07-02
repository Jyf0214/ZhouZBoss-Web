// 简易对象转 YAML 字符串工具
export function toYamlString(obj: Record<string, unknown>, indent = 0): string {
  const pad = '  '.repeat(indent);
  let result = '';
  for (const [key, value] of Object.entries(obj)) {
    result += renderYamlEntry(pad, key, value, indent);
  }
  return result;
}

// 递归渲染单条 YAML 键值(数组 / 对象 / 标量)
function renderYamlEntry(pad: string, key: string, value: unknown, indent: number): string {
  if (Array.isArray(value)) {
    return `${pad}${key}:\n${pad}  ${value.map(item => formatArrayItem(item, pad)).join('')}`;
  }
  if (isPlainObject(value)) {
    return `${pad}${key}:\n${toYamlString(value, indent + 1)}`;
  }
  return `${pad}${key}: ${value}\n`;
}

// 数组项渲染:对象递归 / 标量直接输出
function formatArrayItem(item: unknown, pad: string): string {
  if (isPlainObject(item)) {
    return `- ${toYamlString(item, 0).trim()}\n${pad}  `;
  }
  return `- ${item}\n${pad}  `;
}

// 仅识别"普通对象"(非数组 / 非 null)
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
