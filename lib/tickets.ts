import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

/** 工单模板字段定义 */
export interface TicketField {
  name: string;
  label: string;
  type: 'input' | 'textarea' | 'dropdown' | 'checkboxes';
  options?: string[];
  required: boolean;
}

/** 工单模板 */
export interface TicketTemplate {
  slug: string;
  name: string;
  description: string;
  title: string;
  labels: string[];
  assignees: string[];
  fields: TicketField[];
  body: string; // 模板正文（包含 {{field}} 占位符）
}

const TICKETS_DIR = path.join(process.cwd(), 'tickets');

/**
 * 获取所有工单模板（构建时调用）
 */
export function getTicketTemplates(): TicketTemplate[] {
  if (!fs.existsSync(TICKETS_DIR)) return [];

  const files = fs.readdirSync(TICKETS_DIR).filter(f => f.endsWith('.md'));
  const templates: TicketTemplate[] = [];

  for (const file of files) {
    const filePath = path.join(TICKETS_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);

    // 解析 fields
    const fields: TicketField[] = (data.fields || []).map((f: any) => ({
      name: f.name,
      label: f.label || f.name,
      type: f.type || 'input',
      options: f.options || [],
      required: f.required !== false,
    }));

    templates.push({
      slug: '/' + file.replace(/\.md$/, ''),
      name: data.name || path.basename(file, '.md'),
      description: data.description || '',
      title: data.title || '',
      labels: data.labels || [],
      assignees: data.assignees || [],
      fields,
      body: content,
    });
  }

  return templates;
}

/**
 * 根据 slug 获取单个工单模板
 */
export function getTicketTemplate(slug: string): TicketTemplate | null {
  const templates = getTicketTemplates();
  return templates.find(t => t.slug === slug) || null;
}

/**
 * 将表单数据填充到模板中，生成最终 markdown 内容
 */
export function renderTicketBody(template: TicketTemplate, formData: Record<string, string>): string {
  let body = template.body;

  // 替换 {{fieldName}} 占位符
  for (const [key, value] of Object.entries(formData)) {
    body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }

  return body;
}
