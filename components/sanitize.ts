/**
 * HTML 和 CSS 消毒工具
 * 用于防止存储型 XSS 攻击
 */

// 危险 HTML 标签列表（含自闭合标签）
const DANGEROUS_TAGS = /<\s*\/?\s*(script|iframe|object|embed|applet|form|input|button|textarea|select)\b[^>]*>[\s\S]*?<\s*\/\s*(script|iframe|object|embed|applet|form|input|button|textarea|select)\s*>|<\s*(script|iframe|object|embed|applet|form|input|button|textarea|select)\b[^>]*\/?>/gi;

// 事件处理器属性（on*）
const EVENT_HANDLER_ATTRS = /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

// javascript: URL（允许引号与 javascript: 之间存在空白字符）
const JS_URL = /href\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*')/gi;
const JS_URL_IN_STYLE = /url\s*\(\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*')\s*\)/gi;
// 通用 javascript: 协议检测（兜底安全网）
const JS_URL_GENERAL = /javascript\s*:/gi;

/**
 * 清理 HTML 头部注入内容
 * 移除危险标签、事件处理器和 javascript: URL
 * 保留 <meta>, <link>, <style>, <title> 等安全标签
 */
export function sanitizeHeadHtml(html: string): string {
  if (!html) return '';

  let sanitized = html;

  // 1. 移除危险标签及其内容
  sanitized = sanitized.replace(DANGEROUS_TAGS, '');

  // 2. 移除事件处理器属性
  sanitized = sanitized.replace(EVENT_HANDLER_ATTRS, '');

  // 3. 移除 javascript: URL
  sanitized = sanitized.replace(JS_URL, ' href=""');

  // 4. 兜底：移除所有 javascript: 协议引用（处理任意上下文中的绕过）
  sanitized = sanitized.replace(JS_URL_GENERAL, '');

  return sanitized;
}

/**
 * 清理 CSS 内容
 * 移除 IE 表达式、Firefox XBL 绑定、JavaScript URL 和危险 @import
 */
export function sanitizeCss(css: string): string {
  if (!css) return '';

  let sanitized = css;

  // 1. 移除 IE CSS 表达式
  sanitized = sanitized.replace(/expression\s*\([^)]*\)/gi, '');

  // 2. 移除 Firefox -moz-binding
  sanitized = sanitized.replace(/-moz-binding\s*:[^;]*;/gi, '');

  // 3. 移除 url() 中的 javascript:
  sanitized = sanitized.replace(JS_URL_IN_STYLE, 'url()');

  // 4. 移除 @import 外部 URL
  sanitized = sanitized.replace(/@import\s+(?:url\s*\(\s*)?['"][^'"]+['"]\s*\)?\s*;?/gi, '');

  // 5. 兜底：移除所有 javascript: 协议引用（处理任意上下文中的绕过）
  sanitized = sanitized.replace(JS_URL_GENERAL, '');

  return sanitized;
}
