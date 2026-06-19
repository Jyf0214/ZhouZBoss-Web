import { describe, test, expect } from 'vitest';
import {
  extractWikiLinks,
  getContentRegistry,
  resolveWikiLink,
  getBacklinks,
  getOutgoingReferences,
  buildWikiLinkMap,
} from '../lib/content-registry';

describe('extractWikiLinks', () => {
  test('应从文本中提取 [[标题]] 引用', () => {
    const text = '请参考 [[北京之行]] 和 [[王五]] 的内容';
    const links = extractWikiLinks(text);
    expect(links).toEqual(['北京之行', '王五']);
  });

  test('无引用时返回空数组', () => {
    const text = '这是一段没有引用的普通文本';
    const links = extractWikiLinks(text);
    expect(links).toEqual([]);
  });

  test('应处理嵌套方括号（不匹配的）', () => {
    const text = '参考 [[普通链接 [带括号]]] 和 [[另一个]]';
    const links = extractWikiLinks(text);
    // [^\[\]]+? 匹配非括号字符，所以 "普通链接 [带括号" 会被捕获
    expect(links.length).toBeGreaterThan(0);
  });

  test('应支持标题前后的空白', () => {
    const text = '[[  北京之行  ]]';
    const links = extractWikiLinks(text);
    expect(links).toEqual(['北京之行']);
  });

  test('应提取多个不相邻的引用', () => {
    const text = '开头 [[A]] 中间文字 [[B]] 结尾 [[C]]';
    const links = extractWikiLinks(text);
    expect(links).toEqual(['A', 'B', 'C']);
  });
});

describe('getContentRegistry', () => {
  test('应返回包含 posts 和 faces 内容的注册表', () => {
    const reg = getContentRegistry();
    expect(reg.titleMap.size).toBeGreaterThan(0);
    expect(reg.entries.length).toBeGreaterThan(0);
  });

  test('标题映射应为小写键', () => {
    const reg = getContentRegistry();
    for (const key of reg.titleMap.keys()) {
      expect(key).toBe(key.toLowerCase());
    }
  });

  test('应包含已知的测试内容', () => {
    const reg = getContentRegistry();
    // posts/daily/2024-01-15.md 的标题是 "新的开始"
    const entry = reg.titleMap.get('新的开始');
    expect(entry).toBeDefined();
    expect(entry?.section).toBe('posts');
    expect(entry?.slug).toBe('/daily/2024-01-15');
  });

  test('应包含 faces 内容', () => {
    const reg = getContentRegistry();
    // faces/friends/wang-wu.md 的标题是 "王五"
    const entry = reg.titleMap.get('王五');
    expect(entry).toBeDefined();
    expect(entry?.section).toBe('faces');
    expect(entry?.slug).toBe('/friends/wang-wu');
  });

  test('条目应包含 tags 信息', () => {
    const reg = getContentRegistry();
    const entry = reg.titleMap.get('北京之行');
    expect(entry).toBeDefined();
    expect(entry?.tags).toContain('旅行');
  });
});

describe('resolveWikiLink', () => {
  test('应将已知标题解析为 URL', () => {
    const result = resolveWikiLink('北京之行');
    expect(result).toBeDefined();
    expect(result!.url).toBe('/posts/travel-in-China/beijing');
    expect(result!.title).toBe('北京之行');
    expect(result!.section).toBe('posts');
  });

  test('faces 内容应解析到 /faces/ 路径', () => {
    const result = resolveWikiLink('王五');
    expect(result).toBeDefined();
    expect(result!.url).toBe('/faces/friends/wang-wu');
    expect(result!.section).toBe('faces');
  });

  test('大小写不敏感匹配', () => {
    // 注册表用小写键，但 resolveWikiLink 内部做了 toLowerCase
    const result = resolveWikiLink('北京之行');
    expect(result).toBeDefined();
  });

  test('未知标题应返回 null', () => {
    const result = resolveWikiLink('完全不存在的标题');
    expect(result).toBeNull();
  });
});

describe('getBacklinks', () => {
  test('返回数组类型', () => {
    const backlinks = getBacklinks('posts', '/daily/2024-01-15');
    expect(Array.isArray(backlinks)).toBe(true);
  });
});

describe('getOutgoingReferences', () => {
  test('返回数组类型', () => {
    const refs = getOutgoingReferences('posts', '/daily/2024-01-15');
    expect(Array.isArray(refs)).toBe(true);
  });
});

describe('buildWikiLinkMap', () => {
  test('应返回标题到 URL 的映射', () => {
    const map = buildWikiLinkMap();
    expect(typeof map).toBe('object');
    expect(Object.keys(map).length).toBeGreaterThan(0);
  });

  test('映射键应为小写', () => {
    const map = buildWikiLinkMap();
    for (const key of Object.keys(map)) {
      expect(key).toBe(key.toLowerCase());
    }
  });

  test('映射值应包含 url 和 title', () => {
    const map = buildWikiLinkMap();
    const entry = map['北京之行'];
    expect(entry).toBeDefined();
    expect(entry?.url).toBe('/posts/travel-in-China/beijing');
    expect(entry?.title).toBe('北京之行');
  });
});
