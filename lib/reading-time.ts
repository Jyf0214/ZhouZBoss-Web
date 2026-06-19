/**
 * 阅读时间估算工具
 *
 * 去除 HTML 标签和 Markdown 语法，统计有效字符数，
 * 中文按约 400 字/分钟估算阅读时间。
 */

/** 中文阅读速度：约 400 字/分钟 */
const CHINESE_READING_SPEED = 400;

/** 英文阅读速度：约 200 词/分钟（约 1000 字符） */
const ENGLISH_READING_SPEED = 1000;

/** 最小阅读时间（分钟） */
const MIN_READING_TIME = 1;

/**
 * 去除 HTML 标签和 Markdown 语法，返回纯文本
 */
function stripMarkup(text: string): string {
  return text
    // 去除 HTML 标签
    .replace(/<[^>]+>/g, '')
    // 去除 Markdown 标题标记
    .replace(/^#{1,6}\s+/gm, '')
    // 去除 Markdown 粗体/斜体标记
    .replace(/[*_]{1,3}/g, '')
    // 去除 Markdown 行内代码和代码块
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    // 去除 Markdown 链接语法，保留文字
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // 去除 Markdown 图片语法
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '')
    // 去除 Markdown 引用标记
    .replace(/^>\s+/gm, '')
    // 去除 Markdown 分隔线
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // 去除 YAML frontmatter
    .replace(/^---[\s\S]*?---\s*/m, '')
    // 去除多余空白
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 估算文本的阅读时间（分钟）
 *
 * @param content - 文本内容（支持 Markdown 和 HTML）
 * @returns 预估阅读时间（分钟），至少 1 分钟
 */
export function estimateReadingTime(content: string): number {
  if (!content) return MIN_READING_TIME;

  const plainText = stripMarkup(content);
  if (!plainText) return MIN_READING_TIME;

  // 统计中文字符数
  const chineseChars = (plainText.match(/[\u4e00-\u9fff]/g) ?? []).length;

  // 统计英文单词数（去除中文字符后按空格分词）
  const englishText = plainText.replace(/[\u4e00-\u9fff]/g, ' ');
  const englishWords = englishText.split(/\s+/).filter(Boolean).length;

  // 加权计算：中文字符按中文速度，英文单词按英文速度
  const chineseMinutes = chineseChars / CHINESE_READING_SPEED;
  const englishMinutes = englishWords / ENGLISH_READING_SPEED;
  const totalMinutes = chineseMinutes + englishMinutes;

  return Math.max(MIN_READING_TIME, Math.ceil(totalMinutes));
}

/**
 * 获取阅读时间的显示文本
 *
 * @param content - 文本内容
 * @param locale - 语言区域（默认 'zh-CN'）
 * @returns 格式化的阅读时间文本
 */
export function formatReadingTime(content: string, locale = 'zh-CN'): string {
  const minutes = estimateReadingTime(content);
  if (locale.startsWith('zh')) {
    return `阅读 ${minutes} 分钟`;
  }
  return `${minutes} min read`;
}
