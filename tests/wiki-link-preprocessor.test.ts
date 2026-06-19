import { describe, test, expect } from 'vitest';
import { extractWikiLinksFromContent } from '../app/diary/_components/diary-utils';
import type { WikiLinkMap } from '../components/MarkdownRenderer/types';

describe('extractWikiLinksFromContent', () => {
  const mockMap: WikiLinkMap = {
    '北京之行': { url: '/posts/travel-in-China/beijing', title: '北京之行' },
    '王五': { url: '/faces/friends/wang-wu', title: '王五' },
  };

  test('应从内容中提取并解析 [[标题]] 引用', () => {
    const content = '今天去了北京，参考 [[北京之行]] 的攻略';
    const refs = extractWikiLinksFromContent(content, mockMap);
    expect(refs).toHaveLength(1);
    expect(refs[0]?.title).toBe('北京之行');
    expect(refs[0]?.type).toBe('post');
    expect(refs[0]?.slug).toBe('/travel-in-China/beijing');
  });

  test('应提取多个引用', () => {
    const content = '参考 [[北京之行]] 和 [[王五]]';
    const refs = extractWikiLinksFromContent(content, mockMap);
    expect(refs).toHaveLength(2);
  });

  test('未解析的引用不应出现在结果中', () => {
    const content = '参考 [[不存在的标题]] 和 [[北京之行]]';
    const refs = extractWikiLinksFromContent(content, mockMap);
    expect(refs).toHaveLength(1);
    expect(refs[0]?.title).toBe('北京之行');
  });

  test('无 wikiLinkMap 时返回空数组', () => {
    const content = '参考 [[北京之行]]';
    const refs = extractWikiLinksFromContent(content);
    expect(refs).toEqual([]);
  });

  test('无引用时返回空数组', () => {
    const content = '普通文本没有引用';
    const refs = extractWikiLinksFromContent(content, mockMap);
    expect(refs).toEqual([]);
  });

  test('应去重相同标题的引用', () => {
    const content = '[[北京之行]] 和 [[北京之行]]';
    const refs = extractWikiLinksFromContent(content, mockMap);
    expect(refs).toHaveLength(1);
  });

  test('faces 引用应标记为 face 类型', () => {
    const content = '和 [[王五]] 一起去的';
    const refs = extractWikiLinksFromContent(content, mockMap);
    expect(refs).toHaveLength(1);
    expect(refs[0]?.type).toBe('face');
    expect(refs[0]?.slug).toBe('/friends/wang-wu');
  });
});
