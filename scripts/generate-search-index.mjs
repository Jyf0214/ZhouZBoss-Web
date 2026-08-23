#!/usr/bin/env node
/**
 * 构建时搜索索引生成脚本
 *
 * 在 next build 之前执行，扫描 posts 目录，将公开 Markdown 文章的
 * 元数据与内容摘要预提取到 JSON 索引文件中，供前端搜索直接加载。
 *
 * 输出文件: public/search-index.json（构建产物，public/ 不纳入版本控制）
 *
 * 设计要点:
 *   - 仅收录公开且未隐藏的文章：与 lib/content.ts filterPublicFiles 语义一致
 *     （文件 public !== false、hidden !== true、直接父目录 index.md public !== false），
 *     私有/草稿文章及其正文绝不进入可公开下载的索引
 *   - 内容截取前 5000 字用于全文匹配
 *   - 纯 Node ESM，只依赖项目已有的 gray-matter
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const POSTS_DIR = path.join(PROJECT_ROOT, 'posts');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'search-index.json');

const LOG_PREFIX = '[generate-search-index]';

/** 内容截取上限（字符数），用于运行时全文匹配 */
const CONTENT_SNIPPET_MAX = 5000;

/**
 * 读取 config.yaml 中 access.posts 的 private/public 规则
 *
 * 搜索索引面向匿名访客，按 canAccess 的最严口径（isAuthenticated=false、
 * hasDb=false）过滤：命中 private 规则的内容绝不进入公开索引，
 * 未命中 public 规则的同样不可见。
 * 匹配逻辑须与 src/lib/config.ts 的 matchPath 保持一致，改动需双向同步。
 */
function loadPostAccessRules() {
  const defaults = { public: [], private: [] };
  try {
    const configFile = path.join(PROJECT_ROOT, 'config.yaml');
    if (!fs.existsSync(configFile)) return defaults;
    const parsed = yaml.load(fs.readFileSync(configFile, 'utf-8'));
    const section = parsed?.access?.posts;
    if (!section || typeof section !== 'object') return defaults;
    return {
      public: Array.isArray(section.public) ? section.public.map(String) : [],
      private: Array.isArray(section.private) ? section.private.map(String) : [],
    };
  } catch (err) {
    // 配置读取/解析失败必须显式暴露，不得静默当作无规则继续构建
    console.error(`${LOG_PREFIX} 读取 config.yaml access.posts 失败: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

/**
 * 判断 slug 是否匹配脱字符模式（与 src/lib/config.ts matchPath 保持一致）
 */
function matchPath(pattern, target) {
  if (pattern === '*') return true;
  if (pattern.startsWith('^')) {
    const prefix = pattern.slice(1);
    return target === prefix || target.startsWith(prefix + '/');
  }
  return target === pattern;
}

/**
 * 匿名视角下该 slug 是否可访问（canAccess 匿名口径）
 */
function isAccessibleByAnonymous(slug, rules) {
  if (rules.private.some((p) => matchPath(p, slug))) return false;
  return rules.public.some((p) => matchPath(p, slug));
}

/**
 * 读取目录 index.md 的 public 标记（与 filterPublicFiles 的直接父目录检查一致）
 * 目录无 index.md 时视为公开
 */
function isDirPublic(dir) {
  const indexFile = path.join(dir, 'index.md');
  if (!fs.existsSync(indexFile)) return true;
  try {
    const { data } = matter(fs.readFileSync(indexFile, 'utf-8'));
    return data.public !== false;
  } catch {
    return true;
  }
}

/**
 * 递归扫描目录，收集公开 .md 文件的元数据与内容摘要
 * @param {string} dir 当前扫描目录
 * @param {string} baseDir posts 根目录，用于计算 slug
 * @param {boolean} parentPublic 父目录是否公开（private 目录整棵跳过）
 * @param {{public: string[], private: string[]}} rules config.yaml access.posts 规则
 * @returns {Array<{slug: string, title: string, description: string, tags: string[], content: string}>}
 */
function scanFiles(dir, baseDir, parentPublic, rules) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // 目录自身标记为私有（index.md public: false）时整棵跳过
      const dirPublic = parentPublic && isDirPublic(fullPath);
      if (!dirPublic) continue;
      results.push(...scanFiles(fullPath, baseDir, true, rules));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      // index.md 是目录索引而非文章，不进入搜索索引
      if (entry.name === 'index.md') continue;

      const relative = path.relative(baseDir, fullPath);
      const slug = '/' + relative.replace(/\.md$/, '').replace(/\\/g, '/');

      // 权限过滤：config.yaml access.posts 规则命中的内容不入索引
      // （与详情页 canAccess 匿名口径对齐——详情 404 的文章正文不得泄露进索引）
      if (!isAccessibleByAnonymous(slug, rules)) continue;

      const raw = fs.readFileSync(fullPath, 'utf-8');
      const { data, content } = matter(raw);

      // 权限过滤：private/hidden 文章不入索引（对齐 filterPublicFiles）
      if (data.public === false || data.hidden === true) continue;

      // 加密文章（frontmatter 含 password 字段）：正文为密文，
      // 不入索引（密文无搜索匹配价值，且避免密文随索引外泄），
      // 标题/描述/标签仍可被搜索到（与列表页可见性一致）
      const isEncrypted = typeof data.password === 'string' && data.password !== '';

      results.push({
        slug,
        title: String(data.title ?? ''),
        description: String(data.description ?? ''),
        tags: Array.isArray(data.tags) ? data.tags : [],
        content: isEncrypted ? '' : content.slice(0, CONTENT_SNIPPET_MAX),
      });
    }
  }

  return results;
}

function main() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.log(`${LOG_PREFIX} posts 目录不存在，跳过索引生成`);
    process.exit(0);
  }

  const rules = loadPostAccessRules();
  const index = scanFiles(POSTS_DIR, POSTS_DIR, true, rules);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2), 'utf-8');

  const sizeKB = (Buffer.byteLength(JSON.stringify(index), 'utf-8') / 1024).toFixed(1);
  console.log(`${LOG_PREFIX} 搜索索引已生成: ${index.length} 篇文章, ${sizeKB} KB -> ${path.relative(PROJECT_ROOT, OUTPUT_FILE)}`);
}

main();
