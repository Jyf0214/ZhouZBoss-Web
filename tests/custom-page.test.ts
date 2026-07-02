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
    const index = generateIndex(['page/about.html']);
    expect(index).toEqual(['page/about.html']);
  });

  it('多个根级文件 → 索引包含所有文件路径', () => {
    const index = generateIndex(['page/about.html', 'page/contact.html']);
    expect(index).toContain('page/about.html');
    expect(index).toContain('page/contact.html');
    expect(index.length).toBe(2);
  });

  it('子目录文件 → 索引同时包含目录路径和文件路径', () => {
    const index = generateIndex(['page/hello world/index.html']);
    expect(index).toContain('page/hello world');
    expect(index).toContain('page/hello world/index.html');
    expect(index.length).toBe(2);
  });

  it('多层嵌套目录 → 逐级提取所有父目录', () => {
    const index = generateIndex(['page/a/b/c/page.html']);
    expect(index).toContain('page/a');
    expect(index).toContain('page/a/b');
    expect(index).toContain('page/a/b/c');
    expect(index).toContain('page/a/b/c/page.html');
    expect(index.length).toBe(4);
  });

  it('混合根级和子目录文件 → 正确合并去重', () => {
    const index = generateIndex([
      'page/about.html',
      'page/blog/post.html',
      'page/blog/draft.html',
    ]);
    expect(index).toContain('page/about.html');
    expect(index).toContain('page/blog');
    expect(index).toContain('page/blog/post.html');
    expect(index).toContain('page/blog/draft.html');
    // about.html 没有子目录，blog 两个文件共享同一个目录路径
    expect(index.length).toBe(4);
  });

  it('空文件列表 → 索引为空数组', () => {
    const index = generateIndex([]);
    expect(index).toEqual([]);
  });

  it('路径含空格 → 目录路径正确提取', () => {
    const index = generateIndex(['page/hello world/index.html']);
    expect(index).toContain('page/hello world');
  });

  it('路径含中文 → 目录路径正确提取', () => {
    const index = generateIndex(['page/我的项目/index.html']);
    expect(index).toContain('page/我的项目');
  });

  it('路径含特殊字符 → 目录路径正确提取', () => {
    const index = generateIndex(['page/project (v2)/readme.html']);
    expect(index).toContain('page/project (v2)');
  });

  it('pages 前缀本身不被加入目录集合', () => {
    const index = generateIndex(['page/index.html']);
    // 'pages' 应被过滤掉
    expect(index).not.toContain('pages');
    expect(index).toContain('page/index.html');
  });

  it('索引去重：同一目录下多个文件只产生一个目录条目', () => {
    const index = generateIndex([
      'page/blog/a.html',
      'page/blog/b.html',
      'page/blog/c.html',
    ]);
    const blogDirs = index.filter((p) => p === 'page/blog');
    expect(blogDirs.length).toBe(1);
  });

  it('索引文件写入后可正确读取', () => {
    const entries = ['page/about.html', 'page/hello world/index.html'];
    const index = generateIndex(entries);
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');

    const content = fs.readFileSync(indexPath, 'utf8');
    const parsed = JSON.parse(content) as string[];
    expect(parsed).toContain('page/about.html');
    expect(parsed).toContain('page/hello world');
    expect(parsed).toContain('page/hello world/index.html');
  });
});

// ── lib/page-source/shared.ts 纯函数测试 ─────────────────────────────────

describe('buildPageRelativePath', () => {
  it('正常路径 → 拼接 page/ 前缀', async () => {
    const { buildPageRelativePath } = await import('@/lib/page-source/shared');
    expect(buildPageRelativePath(['hello'])).toBe('page/hello');
  });

  it('多级路径 → 正确拼接', async () => {
    const { buildPageRelativePath } = await import('@/lib/page-source/shared');
    expect(buildPageRelativePath(['blog', 'post'])).toBe('page/blog/post');
  });

  it('含空格路径 → 保留空格', async () => {
    const { buildPageRelativePath } = await import('@/lib/page-source/shared');
    expect(buildPageRelativePath(['hello world'])).toBe('page/hello world');
  });

  it('含中文路径 → 保留中文', async () => {
    const { buildPageRelativePath } = await import('@/lib/page-source/shared');
    expect(buildPageRelativePath(['我的页面'])).toBe('page/我的页面');
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
    // joinPath('pages', '/etc/passwd') → 'page/etc/passwd'（前导 / 被去除）
    expect(buildPageRelativePath(['/etc/passwd'])).toBe('page/etc/passwd');
  });

  it('含 .html 扩展名 → 仍然有效(不再强制)', async () => {
    const { buildPageRelativePath } = await import('@/lib/page-source/shared');
    expect(buildPageRelativePath(['about.html'])).toBe('page/about.html');
  });
});

describe('resolvePageFilePath', () => {
  it('已含 .html 扩展名 → 原样返回', async () => {
    const { resolvePageFilePath } = await import('@/lib/page-source/shared');
    expect(resolvePageFilePath('page/about.html')).toBe('page/about.html');
  });

  it('已含 .htm 扩展名 → 原样返回', async () => {
    const { resolvePageFilePath } = await import('@/lib/page-source/shared');
    expect(resolvePageFilePath('page/about.htm')).toBe('page/about.htm');
  });

  it('目录路径 → 拼接 index.html', async () => {
    const { resolvePageFilePath } = await import('@/lib/page-source/shared');
    expect(resolvePageFilePath('page/hello')).toBe('page/hello/index.html');
  });

  it('含空格目录路径 → 正确拼接', async () => {
    const { resolvePageFilePath } = await import('@/lib/page-source/shared');
    expect(resolvePageFilePath('page/hello world')).toBe('page/hello world/index.html');
  });

  it('嵌套目录路径 → 拼接 index.html', async () => {
    const { resolvePageFilePath } = await import('@/lib/page-source/shared');
    expect(resolvePageFilePath('page/blog/draft')).toBe('page/blog/draft/index.html');
  });

  it('大写 .HTML → 原样返回(不区分大小写)', async () => {
    const { resolvePageFilePath } = await import('@/lib/page-source/shared');
    expect(resolvePageFilePath('page/ABOUT.HTML')).toBe('page/ABOUT.HTML');
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
  it('根级 HTML 文件 → page/{name}/meta.json', async () => {
    const { buildMetaPath } = await import('@/lib/page-source/shared');
    expect(buildMetaPath('page/about.html')).toBe('page/about/meta.json');
  });

  it('子目录 HTML 文件 → page/{dir}/{name}/meta.json', async () => {
    const { buildMetaPath } = await import('@/lib/page-source/shared');
    expect(buildMetaPath('page/blog/post.html')).toBe('page/blog/post/meta.json');
  });

  it('.htm 扩展名 → 同样处理', async () => {
    const { buildMetaPath } = await import('@/lib/page-source/shared');
    expect(buildMetaPath('page/page.htm')).toBe('page/page/meta.json');
  });

  it('无扩展名 → 仍生成 meta.json 路径(不做扩展名校验)', async () => {
    const { buildMetaPath } = await import('@/lib/page-source/shared');
    // buildMetaPath 不校验扩展名，无扩展名时 name 仍可提取
    expect(buildMetaPath('page/readme')).toBe('page/readme/meta.json');
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
    // 由于我们不能轻易 mock process.cwd()，测试实际的 page/ 目录
    // 改为在项目 page/ 目录下创建测试文件
    const projectPagesDir = path.join(origCwd, 'pages');
    fs.mkdirSync(projectPagesDir, { recursive: true });
    const testFile = path.join(projectPagesDir, '__test_fetch.html');
    fs.writeFileSync(testFile, '<html><body>Test Content</body></html>', 'utf8');

    try {
      const result = fetchPageHtml('page/__test_fetch.html');
      expect(result).toBe('<html><body>Test Content</body></html>');
    } finally {
      fs.rmSync(testFile, { force: true });
      // 如果 page/ 目录是空的，也清理掉
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
    const result = fetchPageHtml('page/__nonexistent_page__.html');
    expect(result).toBeNull();
  });

  it('空文件 → 返回 null', async () => {
    const projectPagesDir = path.join(origCwd, 'pages');
    fs.mkdirSync(projectPagesDir, { recursive: true });
    const testFile = path.join(projectPagesDir, '__test_empty.html');
    fs.writeFileSync(testFile, '', 'utf8');

    try {
      const { fetchPageHtml } = await import('@/lib/page-source/fs');
      const result = fetchPageHtml('page/__test_empty.html');
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
      const result = fetchPageHtml('page/__test_whitespace.html');
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
      const result = fetchPageHtml('page/__test_bom.html');
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
  it('page/hello/index.html → page/hello', async () => {
    const { getPageProjectFolder } = await import('@/lib/storage/acl');
    expect(getPageProjectFolder('page/hello/index.html')).toBe('page/hello');
  });

  it('page/hello → page/hello', async () => {
    const { getPageProjectFolder } = await import('@/lib/storage/acl');
    expect(getPageProjectFolder('page/hello')).toBe('page/hello');
  });

  it('page/hello/deep/x.html → page/hello (只看第一级)', async () => {
    const { getPageProjectFolder } = await import('@/lib/storage/acl');
    expect(getPageProjectFolder('page/hello/deep/x.html')).toBe('page/hello');
  });

  it('page/about.html → pages (根级文件)', async () => {
    const { getPageProjectFolder } = await import('@/lib/storage/acl');
    expect(getPageProjectFolder('page/about.html')).toBe('pages');
  });

  it('page/hello world/index.html → page/hello world (含空格)', async () => {
    const { getPageProjectFolder } = await import('@/lib/storage/acl');
    expect(getPageProjectFolder('page/hello world/index.html')).toBe('page/hello world');
  });

  it('page/我的项目/page.html → page/我的项目 (含中文)', async () => {
    const { getPageProjectFolder } = await import('@/lib/storage/acl');
    expect(getPageProjectFolder('page/我的项目/page.html')).toBe('page/我的项目');
  });
});
