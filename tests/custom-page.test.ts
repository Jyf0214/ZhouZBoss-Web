/**
 * 自定义页面系统测试
 *
 * 覆盖范围:
 * - sync-pages.mjs 索引生成逻辑(writePagesIndex)
 * - lib/page-source/shared.ts 纯函数:
 *   - buildPageRelativePath: 路径拼接与校验
 *   - resolvePageFilePath: 目录→index.html 解析
 *   - isHtmlPath: 扩展名校验
 *   - extractTitle: HTML title 提取
 *   - buildMetaPath: meta.json 路径推导
 *   - validatePageMeta: meta.json 白名单校验
 * - lib/page-source/fs.ts 本地文件读取
 * - 页面路由集成: 路径解析→文件读取→权限检查完整流程
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// ── sync-pages.mjs 索引生成逻辑测试 ─────────────────────────────────────

describe('sync-pages 索引生成逻辑(writePagesIndex)', () => {
  const tmpDir = path.join(process.cwd(), '.test-tmp-pages-index');
  const dataDir = path.join(tmpDir, 'data');
  const indexPath = path.join(dataDir, 'pages-index.json');

  beforeEach(() => {
    fs.mkdirSync(dataDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  /**
   * 模拟 writePagesIndex 的核心逻辑（从 sync-pages.mjs 提取）
   * 用于单元测试索引生成算法
   */
  function generateIndex(entries: string[]): string[] {
    const dirs = new Set<string>();
    for (const entry of entries) {
      const parts = entry.split('/');
      for (let i = 1; i < parts.length; i++) {
        const dirPath = parts.slice(0, i).join('/');
        if (dirPath && dirPath !== 'pages') {
          dirs.add(dirPath);
        }
      }
    }
    return [...new Set([...entries, ...dirs])];
  }

  it('单个根级文件 → 索引仅含文件路径', () => {
    const index = generateIndex(['pages/about.html']);
    expect(index).toEqual(['pages/about.html']);
  });

  it('多个根级文件 → 索引包含所有文件路径', () => {
    const index = generateIndex(['pages/about.html', 'pages/contact.html']);
    expect(index).toContain('pages/about.html');
    expect(index).toContain('pages/contact.html');
    expect(index.length).toBe(2);
  });

  it('子目录文件 → 索引同时包含目录路径和文件路径', () => {
    const index = generateIndex(['pages/hello world/index.html']);
    expect(index).toContain('pages/hello world');
    expect(index).toContain('pages/hello world/index.html');
    expect(index.length).toBe(2);
  });

  it('多层嵌套目录 → 逐级提取所有父目录', () => {
    const index = generateIndex(['pages/a/b/c/page.html']);
    expect(index).toContain('pages/a');
    expect(index).toContain('pages/a/b');
    expect(index).toContain('pages/a/b/c');
    expect(index).toContain('pages/a/b/c/page.html');
    expect(index.length).toBe(4);
  });

  it('混合根级和子目录文件 → 正确合并去重', () => {
    const index = generateIndex([
      'pages/about.html',
      'pages/blog/post.html',
      'pages/blog/draft.html',
    ]);
    expect(index).toContain('pages/about.html');
    expect(index).toContain('pages/blog');
    expect(index).toContain('pages/blog/post.html');
    expect(index).toContain('pages/blog/draft.html');
    // about.html 没有子目录，blog 两个文件共享同一个目录路径
    expect(index.length).toBe(4);
  });

  it('空文件列表 → 索引为空数组', () => {
    const index = generateIndex([]);
    expect(index).toEqual([]);
  });

  it('路径含空格 → 目录路径正确提取', () => {
    const index = generateIndex(['pages/hello world/index.html']);
    expect(index).toContain('pages/hello world');
  });

  it('路径含中文 → 目录路径正确提取', () => {
    const index = generateIndex(['pages/我的项目/index.html']);
    expect(index).toContain('pages/我的项目');
  });

  it('路径含特殊字符 → 目录路径正确提取', () => {
    const index = generateIndex(['pages/project (v2)/readme.html']);
    expect(index).toContain('pages/project (v2)');
  });

  it('pages 前缀本身不被加入目录集合', () => {
    const index = generateIndex(['pages/index.html']);
    // 'pages' 应被过滤掉
    expect(index).not.toContain('pages');
    expect(index).toContain('pages/index.html');
  });

  it('索引去重：同一目录下多个文件只产生一个目录条目', () => {
    const index = generateIndex([
      'pages/blog/a.html',
      'pages/blog/b.html',
      'pages/blog/c.html',
    ]);
    const blogDirs = index.filter((p) => p === 'pages/blog');
    expect(blogDirs.length).toBe(1);
  });

  it('索引文件写入后可正确读取', () => {
    const entries = ['pages/about.html', 'pages/hello world/index.html'];
    const index = generateIndex(entries);
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');

    const content = fs.readFileSync(indexPath, 'utf8');
    const parsed = JSON.parse(content) as string[];
    expect(parsed).toContain('pages/about.html');
    expect(parsed).toContain('pages/hello world');
    expect(parsed).toContain('pages/hello world/index.html');
  });
});

// ── lib/page-source/shared.ts 纯函数测试 ─────────────────────────────────

describe('buildPageRelativePath', () => {
  it('正常路径 → 拼接 pages/ 前缀', async () => {
    const { buildPageRelativePath } = await import('@/lib/page-source/shared');
    expect(buildPageRelativePath(['hello'])).toBe('pages/hello');
  });

  it('多级路径 → 正确拼接', async () => {
    const { buildPageRelativePath } = await import('@/lib/page-source/shared');
    expect(buildPageRelativePath(['blog', 'post'])).toBe('pages/blog/post');
  });

  it('含空格路径 → 保留空格', async () => {
    const { buildPageRelativePath } = await import('@/lib/page-source/shared');
    expect(buildPageRelativePath(['hello world'])).toBe('pages/hello world');
  });

  it('含中文路径 → 保留中文', async () => {
    const { buildPageRelativePath } = await import('@/lib/page-source/shared');
    expect(buildPageRelativePath(['我的页面'])).toBe('pages/我的页面');
  });

  it('空数组 → null', async () => {
    const { buildPageRelativePath } = await import('@/lib/page-source/shared');
    expect(buildPageRelativePath([])).toBeNull();
  });

  it('含空字符串段 → null', async () => {
    const { buildPageRelativePath } = await import('@/lib/page-source/shared');
    expect(buildPageRelativePath(['hello', ''])).toBeNull();
  });

  it('目录穿越路径 → null', async () => {
    const { buildPageRelativePath } = await import('@/lib/page-source/shared');
    expect(buildPageRelativePath(['..', 'etc', 'passwd'])).toBeNull();
  });

  it('绝对路径 → 前导 / 被 joinPath 去除，路径被当作普通段', async () => {
    const { buildPageRelativePath } = await import('@/lib/page-source/shared');
    // joinPath('pages', '/etc/passwd') → 'pages/etc/passwd'（前导 / 被去除）
    expect(buildPageRelativePath(['/etc/passwd'])).toBe('pages/etc/passwd');
  });

  it('含 .html 扩展名 → 仍然有效(不再强制)', async () => {
    const { buildPageRelativePath } = await import('@/lib/page-source/shared');
    expect(buildPageRelativePath(['about.html'])).toBe('pages/about.html');
  });
});

describe('resolvePageFilePath', () => {
  it('已含 .html 扩展名 → 原样返回', async () => {
    const { resolvePageFilePath } = await import('@/lib/page-source/shared');
    expect(resolvePageFilePath('pages/about.html')).toBe('pages/about.html');
  });

  it('已含 .htm 扩展名 → 原样返回', async () => {
    const { resolvePageFilePath } = await import('@/lib/page-source/shared');
    expect(resolvePageFilePath('pages/about.htm')).toBe('pages/about.htm');
  });

  it('目录路径 → 拼接 index.html', async () => {
    const { resolvePageFilePath } = await import('@/lib/page-source/shared');
    expect(resolvePageFilePath('pages/hello')).toBe('pages/hello/index.html');
  });

  it('含空格目录路径 → 正确拼接', async () => {
    const { resolvePageFilePath } = await import('@/lib/page-source/shared');
    expect(resolvePageFilePath('pages/hello world')).toBe('pages/hello world/index.html');
  });

  it('嵌套目录路径 → 拼接 index.html', async () => {
    const { resolvePageFilePath } = await import('@/lib/page-source/shared');
    expect(resolvePageFilePath('pages/blog/draft')).toBe('pages/blog/draft/index.html');
  });

  it('大写 .HTML → 原样返回(不区分大小写)', async () => {
    const { resolvePageFilePath } = await import('@/lib/page-source/shared');
    expect(resolvePageFilePath('pages/ABOUT.HTML')).toBe('pages/ABOUT.HTML');
  });
});

describe('isHtmlPath', () => {
  it('.html → true', async () => {
    const { isHtmlPath } = await import('@/lib/page-source/shared');
    expect(isHtmlPath('page.html')).toBe(true);
  });

  it('.htm → true', async () => {
    const { isHtmlPath } = await import('@/lib/page-source/shared');
    expect(isHtmlPath('page.htm')).toBe(true);
  });

  it('.HTML → true (不区分大小写)', async () => {
    const { isHtmlPath } = await import('@/lib/page-source/shared');
    expect(isHtmlPath('page.HTML')).toBe(true);
  });

  it('.HTM → true', async () => {
    const { isHtmlPath } = await import('@/lib/page-source/shared');
    expect(isHtmlPath('page.HTM')).toBe(true);
  });

  it('.htmlx → false', async () => {
    const { isHtmlPath } = await import('@/lib/page-source/shared');
    expect(isHtmlPath('page.htmlx')).toBe(false);
  });

  it('.json → false', async () => {
    const { isHtmlPath } = await import('@/lib/page-source/shared');
    expect(isHtmlPath('data.json')).toBe(false);
  });

  it('无扩展名 → false', async () => {
    const { isHtmlPath } = await import('@/lib/page-source/shared');
    expect(isHtmlPath('readme')).toBe(false);
  });

  it('路径含 .html 但不是扩展名 → false', async () => {
    const { isHtmlPath } = await import('@/lib/page-source/shared');
    expect(isHtmlPath('html.parser')).toBe(false);
  });
});

describe('extractTitle', () => {
  it('正常 title → 提取内容', async () => {
    const { extractTitle } = await import('@/lib/page-source/shared');
    expect(extractTitle('<html><head><title>My Page</title></head></html>')).toBe('My Page');
  });

  it('title 前后有空白 → 去除空白', async () => {
    const { extractTitle } = await import('@/lib/page-source/shared');
    expect(extractTitle('<title>  Hello  </title>')).toBe('Hello');
  });

  it('大写 TITLE → 不区分大小写', async () => {
    const { extractTitle } = await import('@/lib/page-source/shared');
    expect(extractTitle('<TITLE>Test</TITLE>')).toBe('Test');
  });

  it('title 内含换行 → 正确提取', async () => {
    const { extractTitle } = await import('@/lib/page-source/shared');
    expect(extractTitle('<title>\nMulti\nLine\n</title>')).toContain('Multi');
  });

  it('无 title 标签 → null', async () => {
    const { extractTitle } = await import('@/lib/page-source/shared');
    expect(extractTitle('<html><body>No title</body></html>')).toBeNull();
  });

  it('空 title → null', async () => {
    const { extractTitle } = await import('@/lib/page-source/shared');
    expect(extractTitle('<title></title>')).toBeNull();
  });

  it('title 只有空白 → null', async () => {
    const { extractTitle } = await import('@/lib/page-source/shared');
    expect(extractTitle('<title>   </title>')).toBeNull();
  });

  it('空字符串 → null', async () => {
    const { extractTitle } = await import('@/lib/page-source/shared');
    expect(extractTitle('')).toBeNull();
  });

  it('title 含 HTML 实体 → 保留原文', async () => {
    const { extractTitle } = await import('@/lib/page-source/shared');
    expect(extractTitle('<title>A &amp; B</title>')).toBe('A &amp; B');
  });
});

describe('buildMetaPath', () => {
  it('根级 HTML 文件 → pages/{name}/meta.json', async () => {
    const { buildMetaPath } = await import('@/lib/page-source/shared');
    expect(buildMetaPath('pages/about.html')).toBe('pages/about/meta.json');
  });

  it('子目录 HTML 文件 → pages/{dir}/{name}/meta.json', async () => {
    const { buildMetaPath } = await import('@/lib/page-source/shared');
    expect(buildMetaPath('pages/blog/post.html')).toBe('pages/blog/post/meta.json');
  });

  it('.htm 扩展名 → 同样处理', async () => {
    const { buildMetaPath } = await import('@/lib/page-source/shared');
    expect(buildMetaPath('pages/page.htm')).toBe('pages/page/meta.json');
  });

  it('无扩展名 → 仍生成 meta.json 路径(不做扩展名校验)', async () => {
    const { buildMetaPath } = await import('@/lib/page-source/shared');
    // buildMetaPath 不校验扩展名，无扩展名时 name 仍可提取
    expect(buildMetaPath('pages/readme')).toBe('pages/readme/meta.json');
  });

  it('根目录下(无父级) → null', async () => {
    const { buildMetaPath } = await import('@/lib/page-source/shared');
    expect(buildMetaPath('about.html')).toBeNull();
  });
});

describe('validatePageMeta', () => {
  it('完整合法 meta → 保留所有字段', async () => {
    const { validatePageMeta } = await import('@/lib/page-source/shared');
    const result = validatePageMeta({
      title: 'My Page',
      description: 'A test page',
      coverImage: '/img/cover.jpg',
      tags: ['test', 'demo'],
      createdAt: '2024-01-01',
      updatedAt: '2024-06-01',
    });
    expect(result).toEqual({
      title: 'My Page',
      description: 'A test page',
      coverImage: '/img/cover.jpg',
      tags: ['test', 'demo'],
      createdAt: '2024-01-01',
      updatedAt: '2024-06-01',
    });
  });

  it('部分字段 → 仅保留合法字段', async () => {
    const { validatePageMeta } = await import('@/lib/page-source/shared');
    const result = validatePageMeta({ title: 'Only Title' });
    expect(result).toEqual({ title: 'Only Title' });
  });

  it('空对象 → 返回空 meta', async () => {
    const { validatePageMeta } = await import('@/lib/page-source/shared');
    const result = validatePageMeta({});
    expect(result).toEqual({});
  });

  it('null → null', async () => {
    const { validatePageMeta } = await import('@/lib/page-source/shared');
    expect(validatePageMeta(null)).toBeNull();
  });

  it('非对象 → null', async () => {
    const { validatePageMeta } = await import('@/lib/page-source/shared');
    expect(validatePageMeta('string')).toBeNull();
    expect(validatePageMeta(42)).toBeNull();
  });

  it('tags 非数组 → 过滤掉', async () => {
    const { validatePageMeta } = await import('@/lib/page-source/shared');
    const result = validatePageMeta({ tags: 'not-array' });
    expect(result).toEqual({});
  });

  it('tags 含非字符串 → 过滤掉整个 tags', async () => {
    const { validatePageMeta } = await import('@/lib/page-source/shared');
    const result = validatePageMeta({ tags: ['ok', 123] });
    expect(result).toEqual({});
  });

  it('title 非字符串 → 过滤掉', async () => {
    const { validatePageMeta } = await import('@/lib/page-source/shared');
    const result = validatePageMeta({ title: 123 });
    expect(result).toEqual({});
  });

  it('多余字段 → 被白名单过滤', async () => {
    const { validatePageMeta } = await import('@/lib/page-source/shared');
    const result = validatePageMeta({
      title: 'Test',
      evilField: '<script>alert(1)</script>',
    });
    expect(result).toEqual({ title: 'Test' });
    expect(result).not.toHaveProperty('evilField');
  });
});

// ── lib/page-source/fs.ts 本地文件读取测试 ──────────────────────────────

describe('fetchPageHtml (本地文件系统)', () => {
  const tmpPagesDir = path.join(process.cwd(), '.test-tmp-pages');
  const origCwd = process.cwd();

  beforeEach(() => {
    fs.mkdirSync(tmpPagesDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpPagesDir, { recursive: true, force: true });
  });

  it('文件存在 → 返回内容', async () => {
    const htmlPath = path.join(tmpPagesDir, 'test.html');
    fs.writeFileSync(htmlPath, '<html><body>Hello</body></html>', 'utf8');

    // 模拟 process.cwd() 指向 tmpPagesDir 的父目录
    const { fetchPageHtml } = await import('@/lib/page-source/fs');
    // fetchPageHtml 使用 process.cwd() 拼接路径，这里用相对路径测试
    // 由于我们不能轻易 mock process.cwd()，测试实际的 pages/ 目录
    // 改为在项目 pages/ 目录下创建测试文件
    const projectPagesDir = path.join(origCwd, 'pages');
    fs.mkdirSync(projectPagesDir, { recursive: true });
    const testFile = path.join(projectPagesDir, '__test_fetch.html');
    fs.writeFileSync(testFile, '<html><body>Test Content</body></html>', 'utf8');

    try {
      const result = fetchPageHtml('pages/__test_fetch.html');
      expect(result).toBe('<html><body>Test Content</body></html>');
    } finally {
      fs.rmSync(testFile, { force: true });
      // 如果 pages/ 目录是空的，也清理掉
      try {
        const remaining = fs.readdirSync(projectPagesDir);
        if (remaining.length === 0) {
          fs.rmSync(projectPagesDir, { recursive: true, force: true });
        }
      } catch {
        // ignore
      }
    }
  });

  it('文件不存在 → 返回 null', async () => {
    const { fetchPageHtml } = await import('@/lib/page-source/fs');
    const result = fetchPageHtml('pages/__nonexistent_page__.html');
    expect(result).toBeNull();
  });

  it('空文件 → 返回 null', async () => {
    const projectPagesDir = path.join(origCwd, 'pages');
    fs.mkdirSync(projectPagesDir, { recursive: true });
    const testFile = path.join(projectPagesDir, '__test_empty.html');
    fs.writeFileSync(testFile, '', 'utf8');

    try {
      const { fetchPageHtml } = await import('@/lib/page-source/fs');
      const result = fetchPageHtml('pages/__test_empty.html');
      expect(result).toBeNull();
    } finally {
      fs.rmSync(testFile, { force: true });
      try {
        const remaining = fs.readdirSync(projectPagesDir);
        if (remaining.length === 0) {
          fs.rmSync(projectPagesDir, { recursive: true, force: true });
        }
      } catch {
        // ignore
      }
    }
  });

  it('仅空白内容 → 返回原始空白(不做 trim)', async () => {
    const projectPagesDir = path.join(origCwd, 'pages');
    fs.mkdirSync(projectPagesDir, { recursive: true });
    const testFile = path.join(projectPagesDir, '__test_whitespace.html');
    fs.writeFileSync(testFile, '   \n\t  ', 'utf8');

    try {
      const { fetchPageHtml } = await import('@/lib/page-source/fs');
      const result = fetchPageHtml('pages/__test_whitespace.html');
      // normalizeWebDavContent 不做 trim，空白内容原样返回
      expect(result).toBe('   \n\t  ');
    } finally {
      fs.rmSync(testFile, { force: true });
      try {
        const remaining = fs.readdirSync(projectPagesDir);
        if (remaining.length === 0) {
          fs.rmSync(projectPagesDir, { recursive: true, force: true });
        }
      } catch {
        // ignore
      }
    }
  });

  it('含 BOM 头的文件 → 返回包含 BOM 的原始内容', async () => {
    const projectPagesDir = path.join(origCwd, 'pages');
    fs.mkdirSync(projectPagesDir, { recursive: true });
    const testFile = path.join(projectPagesDir, '__test_bom.html');
    // 写入 UTF-8 BOM + HTML
    fs.writeFileSync(testFile, '\uFEFF<html><body>BOM</body></html>', 'utf8');

    try {
      const { fetchPageHtml } = await import('@/lib/page-source/fs');
      const result = fetchPageHtml('pages/__test_bom.html');
      expect(result).not.toBeNull();
      // BOM 字符保留在原始内容中（浏览器会自动处理）
      expect(result).toContain('BOM');
    } finally {
      fs.rmSync(testFile, { force: true });
      try {
        const remaining = fs.readdirSync(projectPagesDir);
        if (remaining.length === 0) {
          fs.rmSync(projectPagesDir, { recursive: true, force: true });
        }
      } catch {
        // ignore
      }
    }
  });
});

// ── getPageProjectFolder 路径提取测试 ──────────────────────────────────

describe('getPageProjectFolder', () => {
  it('pages/hello/index.html → pages/hello', async () => {
    const { getPageProjectFolder } = await import('@/lib/storage/acl');
    expect(getPageProjectFolder('pages/hello/index.html')).toBe('pages/hello');
  });

  it('pages/hello → pages/hello', async () => {
    const { getPageProjectFolder } = await import('@/lib/storage/acl');
    expect(getPageProjectFolder('pages/hello')).toBe('pages/hello');
  });

  it('pages/hello/deep/x.html → pages/hello (只看第一级)', async () => {
    const { getPageProjectFolder } = await import('@/lib/storage/acl');
    expect(getPageProjectFolder('pages/hello/deep/x.html')).toBe('pages/hello');
  });

  it('pages/about.html → pages (根级文件)', async () => {
    const { getPageProjectFolder } = await import('@/lib/storage/acl');
    expect(getPageProjectFolder('pages/about.html')).toBe('pages');
  });

  it('pages/hello world/index.html → pages/hello world (含空格)', async () => {
    const { getPageProjectFolder } = await import('@/lib/storage/acl');
    expect(getPageProjectFolder('pages/hello world/index.html')).toBe('pages/hello world');
  });

  it('pages/我的项目/page.html → pages/我的项目 (含中文)', async () => {
    const { getPageProjectFolder } = await import('@/lib/storage/acl');
    expect(getPageProjectFolder('pages/我的项目/page.html')).toBe('pages/我的项目');
  });
});
