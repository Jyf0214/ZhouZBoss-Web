#!/usr/bin/env node
/**
 * 构建时搜索索引生成脚本
 *
 * 在 next build 之前执行，扫描 posts 目录，将所有 Markdown 文章的
 * 元数据与内容摘要预提取到 JSON 索引文件中，供运行时搜索 API 直接
 * 加载内存索引，避免每次请求都递归读取文件系统。
 *
 * 输出文件: data/search-index.json
 * 降级策略: 若索引文件缺失，搜索 API 自动回退到原有的实时扫描逻辑。
 *
 * 设计要点:
 *   - 存储所有文章（不做权限过滤，因为 canAccess 依赖运行时认证状态）
 *   - 内容截取前 5000 字用于全文匹配
 *   - 纯 Node ESM，只依赖项目已有的 gray-matter
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const POSTS_DIR = path.join(PROJECT_ROOT, 'posts');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'search-index.json');

const LOG_PREFIX = '[generate-search-index]';

/** 内容截取上限（字符数），用于运行时全文匹配 */
const CONTENT_SNIPPET_MAX = 5000;

/**
 * 递归扫描目录，收集所有 .md 文件的元数据与内容摘要
 * @param {string} dir 当前扫描目录
 * @param {string} baseDir posts 根目录，用于计算 slug
 * @returns {Array<{slug: string, title: string, description: string, tags: string[], content: string}>}
 */
function scanFiles(dir, baseDir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...scanFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const relative = path.relative(baseDir, fullPath);
      const slug = '/' + relative.replace(/\.md$/, '').replace(/\\/g, '/');

      const raw = fs.readFileSync(fullPath, 'utf-8');
      const { data, content } = matter(raw);

      results.push({
        slug,
        title: String(data.title ?? ''),
        description: String(data.description ?? ''),
        tags: Array.isArray(data.tags) ? data.tags : [],
        content: content.slice(0, CONTENT_SNIPPET_MAX),
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

  const index = scanFiles(POSTS_DIR, POSTS_DIR);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2), 'utf-8');

  const sizeKB = (Buffer.byteLength(JSON.stringify(index), 'utf-8') / 1024).toFixed(1);
  console.log(`${LOG_PREFIX} 搜索索引已生成: ${index.length} 篇文章, ${sizeKB} KB -> ${path.relative(PROJECT_ROOT, OUTPUT_FILE)}`);
}

main();
