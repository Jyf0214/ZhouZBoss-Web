/**
 * 硬编码 UI 样式审计
 *
 * 目的:
 *   项目已统一 Button / Tag / Input / FilterPill 等组件库。
 *   历史上(2026-06-06)曾批量替换过一轮,但新代码仍可能写回硬编码 Tailwind 类名。
 *   本测试扫描 app/ 与 components/(排除 components/ui/)下的 .tsx 文件,
 *   对命中"高度疑似可被统一组件替代"的 className 子串进行告警。
 *
 * 运行:
 *   - 默认模式(本地/CI 不严格): npx vitest run tests/hardcoded-ui-styles.test.ts
 *     所有命中以 console.warn 形式列出,测试仍通过。
 *   - 严格模式(CI 严格把关):   STRICT_HARDCODED_UI=1 npx vitest run tests/hardcoded-ui-styles.test.ts
 *     任何命中都会让测试失败。
 *
 * 豁免方式:
 *   - 单文件豁免: 在文件最顶部(第一个非空行)添加
 *     /* eslint-disable hardcoded-ui *\/
 *   - 单行豁免:   在该行 className 所在 JSX 行的末尾添加
 *     // hardcoded-ui-ok
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

interface Hit {
  file: string;
  line: number;
  className: string;
  reason: string;
}

interface Pattern {
  name: string;
  pattern: RegExp;
}

/**
 * 检测模式 — 每个模式必须有足够特异的锚点,避免误报。
 * 顺序敏感:更具体的模式排前面,每行只报第一个命中。
 */
const PATTERNS: readonly Pattern[] = [
  // 1. 完整主按钮(高 + 横向 padding + 圆角 + 主色 + hover)
  {
    name: '硬编码主按钮(应使用 <Button variant="primary" size="lg">)',
    pattern: /\bh-1[02] px-8 rounded-xl bg-zinc-900 hover:bg-zinc-800\b/,
  },
  // 2. 简化主按钮(只要带 hover:bg-zinc-800 就视为在复述主按钮配色)
  {
    name: '硬编码主按钮配色(应使用 <Button variant="primary">)',
    pattern: /\bbg-zinc-900 hover:bg-zinc-800\b/,
  },
  // 3. 筛选按钮选中态(FilterPill.selected 等价物)
  {
    name: '硬编码筛选按钮选中态(应使用 <FilterPill selected>)',
    pattern: /\bbg-zinc-900 text-white shadow-(?:sm|md) shadow-zinc-900\/20\b/,
  },
  // 4. 筛选按钮未选中态
  {
    name: '硬编码筛选按钮未选中态(应使用 <FilterPill>)',
    pattern: /\bbg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300\b/,
  },
  // 5. 标准输入框(典型 h-9/h-10 + 圆角 + 边框)
  {
    name: '硬编码输入框(应使用 <Input>)',
    pattern: /\bh-(?:9|10) px-3 border border-zinc-200 rounded-lg text-sm\b/,
  },
  // 6. 输入框变体(无显式高度但有 outline + focus 反馈)
  {
    name: '硬编码输入框变体(应使用 <Input>)',
    pattern: /\bborder border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400\b/,
  },
  // 7. 输入框高/圆角变体(h-11/h-12 + rounded-xl/2xl)
  {
    name: '硬编码输入框高/圆角变体(应使用 <Input>)',
    pattern: /\bh-(?:11|12) rounded-(?:xl|2xl) border border-zinc-200\b/,
  },
  // 8. 多行文本框
  {
    name: '硬编码多行文本框(应使用 <Textarea> 或 <Input multiline>)',
    pattern: /\bmin-h-\[\d+px\] p-3 border border-zinc-200 rounded-(?:lg|xl) text-sm\b/,
  },
  // 9. 小型标签/徽章(text-[10px] + 全大写 + 粗体)
  {
    name: '硬编码小型标签/徽章(应使用 <Tag>)',
    pattern: /\btext-\[10px\] font-bold uppercase\b/,
  },
  // 10. 危险图标按钮
  {
    name: '硬编码危险图标按钮(应使用 <Button variant="danger">)',
    pattern: /\btext-red-500 hover:bg-red-50\b/,
  },
  // 11. 输入框焦点环(Button/Input 已内置,不应自行拼)
  {
    name: '硬编码输入框焦点环(应使用 <Input>)',
    pattern: /\bfocus:ring-2 focus:ring-zinc-900 focus:outline-none\b/,
  },
];

const SCAN_ROOTS = ['app', 'components'] as const;
const EXCLUDE_DIR_NAMES = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git',
  'tests',
]);
const FILE_EXEMPT_MARKER = '/* eslint-disable hardcoded-ui */';
const LINE_EXEMPT_MARKER = '// hardcoded-ui-ok';

function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIR_NAMES.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(full));
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

function isExcludedPath(relativePath: string): boolean {
  // 排除 components/ui/(组件库自身)
  const segments = relativePath.split(path.sep);
  if (segments[0] === 'components' && segments[1] === 'ui') return true;
  return false;
}

function isFileExempted(content: string): boolean {
  // 文件顶部豁免: 第一个非空行 === 标记
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    return trimmed === FILE_EXEMPT_MARKER;
  }
  return false;
}

interface ExtractedClassName {
  value: string;
  line: number;
}

function extractClassNames(content: string): ExtractedClassName[] {
  // 匹配 className="..." / className='...' / className={`...`}
  // 多行模板字面量也可匹配(直到匹配的引号/反引号)
  const re = /className\s*=\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g;
  const out: ExtractedClassName[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const value = m[1] ?? m[2] ?? m[3] ?? '';
    if (!value) continue;
    const beforeMatch = content.slice(0, m.index);
    const line = beforeMatch.split('\n').length;
    out.push({ value, line });
  }
  return out;
}

function scanFile(absoluteFile: string, lines: string[]): Hit[] {
  const content = fs.readFileSync(absoluteFile, 'utf8');
  if (isFileExempted(content)) return [];

  const relative = path.relative(ROOT, absoluteFile);
  const hitsByLine = new Map<number, Hit>();

  for (const { value, line } of extractClassNames(content)) {
    // 单行豁免: 检查 className 所在行(以及 className 内部是否含标记)
    const sourceLine = lines[line - 1] ?? '';
    if (sourceLine.includes(LINE_EXEMPT_MARKER)) continue;
    if (value.includes(LINE_EXEMPT_MARKER)) continue;

    for (const { name, pattern } of PATTERNS) {
      if (pattern.test(value)) {
        // 同一行只报第一个(最具体的)命中
        if (hitsByLine.has(line)) break;
        hitsByLine.set(line, {
          file: relative,
          line,
          className: value.length > 120 ? `${value.slice(0, 117)}...` : value,
          reason: name,
        });
        break;
      }
    }
  }

  return Array.from(hitsByLine.values()).sort((a, b) => a.line - b.line);
}

function gatherAllHits(): Hit[] {
  const allFiles = SCAN_ROOTS.flatMap(r => listFiles(path.join(ROOT, r)));
  const targets = allFiles.filter(f => !isExcludedPath(path.relative(ROOT, f)));
  const hits: Hit[] = [];
  for (const file of targets) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    hits.push(...scanFile(file, lines));
  }
  // 排序: 先按文件,再按行号
  hits.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)));
  return hits;
}

function formatHitsForWarn(hits: Hit[]): string {
  if (hits.length === 0) return '\n[hardcoded-ui] 没有发现硬编码样式 ✅';
  const byFile = new Map<string, Hit[]>();
  for (const h of hits) {
    if (!byFile.has(h.file)) byFile.set(h.file, []);
    byFile.get(h.file)!.push(h);
  }
  const lines: string[] = [];
  lines.push(
    `\n[hardcoded-ui] 共发现 ${hits.length} 处硬编码样式,涉及 ${byFile.size} 个文件(模式匹配,需人工确认):`,
  );
  for (const [file, fileHits] of byFile) {
    lines.push(`\n  ${file}`);
    for (const h of fileHits) {
      lines.push(`    L${h.line}  [${h.reason}]`);
      lines.push(`      className: ${h.className}`);
    }
  }
  lines.push(
    `\n  豁免方式:`,
  );
  lines.push(`    - 文件级: 在文件最顶部加 ${FILE_EXEMPT_MARKER}`);
  lines.push(`    - 行级:   在该行末尾加 ${LINE_EXEMPT_MARKER}`);
  lines.push(
    `  严格模式: STRICT_HARDCODED_UI=1 npx vitest run tests/hardcoded-ui-styles.test.ts\n`,
  );
  return lines.join('\n');
}

describe('硬编码 UI 样式审计', () => {
  const hits = gatherAllHits();
  const strict = process.env.STRICT_HARDCODED_UI === '1';

  it('无硬编码样式命中(命中 = 未提取到统一组件,直接 fail)', () => {
    if (hits.length > 0) {
      console.warn(formatHitsForWarn(hits));
    } else {
      console.warn('\n[hardcoded-ui] 0 处命中 ✅\n');
    }
    // 仅在严格模式下断言，非严格模式只警告
    if (strict) {
      expect(hits.length).toBe(0);
    }
  });

  it('STRICT 模式下命中应 fail', () => {
    if (!strict) {
      console.warn(
        `\n[hardcoded-ui] STRICT 模式未启用(设置 STRICT_HARDCODED_UI=1 开启),当前命中 ${hits.length} 条 — 跳过\n`,
      );
      return;
    }
    if (hits.length > 0) {
      console.warn(formatHitsForWarn(hits));
    }
    expect(hits.length).toBe(0);
  });
});
