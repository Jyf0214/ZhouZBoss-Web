#!/usr/bin/env node
// 屏蔽第三方 CLI 噪音(预留,与 scripts/db-init.mjs 风格保持一致)
process.env.PRISMA_HIDE_PREVIEW_FLAG_WARNINGS = 'true';
process.env.PRISMA_HIDE_UPDATE_MESSAGE = 'true';

/**
 * 构建期同步脚本 — 把 WebDAV 的 `pages/` 完整镜像到本地 `./pages/`
 *
 * 触发链:
 *   `npm run build` → `prebuild` → `npm run sync:pages` → 本脚本 → `next build`
 *
 * 行为契约(与设计文档一致):
 *   1. WebDAV 未配置(WEBDAV_URL / WEBDAV_USER / WEBDAV_PASS 任一缺失):
 *      - 清空本地 `./pages/`(`fs.rm` recursive + force)
 *      - 以 exit 0 退出
 *      - 运行时索引页 /page 看到空目录,展示「暂无可用页面」
 *   2. WebDAV 已配置:
 *      - 浅层扫描 WebDAV `pages/` 根 + 1 级子目录(2 层)
 *      - 完全镜像:先 `fs.rm` 清空本地,再逐个下载写入
 *      - 任何 await 失败 → console.error 打印上下文 + process.exit(1)
 *   3. 退出码:
 *      - 0:成功(含 WebDAV 未配置场景)
 *      - 1:任意阶段(网络 / 鉴权 / IO)失败
 *
 * 设计要点:
 *   - 纯 Node ESM(.mjs),无新依赖(与 scripts/db-init.mjs 风格一致)
 *   - 不引入 p-limit,自写一个简单信号量(MAX_CONCURRENCY = 8)
 *   - 复用 `lib/page-source/normalize-webdav.mjs` 的归一化函数,
 *     避免与 lib/page-source/shared.ts 中的 TS 版本漂移
 *   - 复用 `lib/page-source/webdav.ts` 的扫描逻辑?不:该文件依赖
 *     'server-only' 副作用以外的运行时类型注解,且会带 next 生态依赖,
 *     故同步脚本的扫描逻辑这里手写一遍(纯 ESM,只依赖 webdav 客户端)
 */

import { promises as fs } from 'fs';
import path from 'path';
import { createClient } from 'webdav';
import { fileURLToPath } from 'url';
import { normalizeWebDavContent } from '../lib/page-source/normalize-webdav.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

/** 本地镜像目录绝对路径:项目根的 `./pages/` */
const LOCAL_DIR = path.join(PROJECT_ROOT, 'pages');
/** WebDAV 上的同步前缀 */
const WEBDAV_PREFIX = 'pages';
/** 下载并发上限 */
const MAX_CONCURRENCY = 8;

/** 同步日志的统一前缀,便于在 build 日志中过滤 */
const LOG_PREFIX = '[sync-pages]';

/** 终止并以非零退出码退出(供任何 catch 复用) */
function fail(stage, detail) {
  const err = detail instanceof Error ? detail : new Error(String(detail));
  console.error(`${LOG_PREFIX} 同步失败(阶段: ${stage}): ${err.message}`);
  if (err.stack) {
    console.error(err.stack.split('\n').slice(0, 5).join('\n'));
  }
  process.exit(1);
}

/**
 * 简单信号量:把 N 个 Promise 任务限制到 `limit` 并发
 * @template T
 * @param {number} limit 最大并发数
 * @param {() => Promise<T>} worker 单个任务构造器
 * @returns {Promise<T>}
 */
async function runWithLimit(limit, worker) {
  let active = 0;
  const queue = [];
  const wake = () => {
    if (active >= limit) return;
    const next = queue.shift();
    if (!next) return;
    active += 1;
    next();
  };
  return new Promise((resolve, reject) => {
    const tryRun = () => {
      active += 1;
      worker()
        .then(resolve, reject)
        .finally(() => {
          active -= 1;
          wake();
        });
    };
    queue.push(tryRun);
    wake();
  });
}

/**
 * 单层 `getDirectoryContents` 包装:任一异常都终止脚本
 * (与运行时不同:同步脚本必须"失败即终止",不允许吞错)
 */
async function listDir(client, dir) {
  try {
    return await client.getDirectoryContents(dir, { deep: false });
  } catch (err) {
    fail(`list ${dir}`, err);
  }
}

/**
 * 浅层递归(2 层)收集 `pages/` 下所有 .html/.htm 路径
 *
 * @param {{ getDirectoryContents: (p: string, opts: object) => Promise<Array<{ type: 'file' | 'directory'; filename: string }>> }} client
 * @returns {Promise<string[]>} 形如 ['pages/index.html', 'pages/blog/post.html'] 的数组
 */
async function listHtmlRecursive(client) {
  const out = [];
  const rootEntries = await listDir(client, WEBDAV_PREFIX);
  for (const entry of rootEntries) {
    if (entry.type === 'file' && /\.html?$/i.test(entry.filename)) {
      out.push(`${WEBDAV_PREFIX}/${entry.filename}`);
      continue;
    }
    if (entry.type === 'directory') {
      const subPath = `${WEBDAV_PREFIX}/${entry.filename}`;
      const subEntries = await listDir(client, subPath);
      for (const sub of subEntries) {
        if (sub.type === 'file' && /\.html?$/i.test(sub.filename)) {
          out.push(`${subPath}/${sub.filename}`);
        }
      }
    }
  }
  return out;
}

async function main() {
  // 1. 读取环境变量
  const url = process.env.WEBDAV_URL;
  const user = process.env.WEBDAV_USER;
  const pass = process.env.WEBDAV_PASS;

  // 2. 未配置 → 清空本地 ./pages/ → 退出
  if (!url || !user || !pass) {
    console.log(`${LOG_PREFIX} WebDAV 未配置(WEBDAV_URL/USER/PASS 任一缺失),清空 ./pages/ 后跳过`);
    try {
      await fs.rm(LOCAL_DIR, { recursive: true, force: true });
    } catch (err) {
      fail('rm local pages/ (unconfigured path)', err);
    }
    return;
  }

  // 3. 已配置 → 创建客户端(此处不再缓存,脚本生命周期只跑一次)
  let client;
  try {
    client = createClient(url, { username: user, password: pass });
  } catch (err) {
    fail('create webdav client', err);
  }

  // 4. 列出全部目标 HTML 路径
  let entries;
  try {
    entries = await listHtmlRecursive(client);
  } catch (err) {
    fail('list html recursive', err);
  }
  console.log(`${LOG_PREFIX} WebDAV pages/ 共发现 ${entries.length} 个 HTML 文件`);

  // 5. 完全镜像:先清空本地,再逐个写入
  try {
    await fs.rm(LOCAL_DIR, { recursive: true, force: true });
    await fs.mkdir(LOCAL_DIR, { recursive: true });
  } catch (err) {
    fail('reset local pages/', err);
  }

  if (entries.length === 0) {
    console.log(`${LOG_PREFIX} 同步完成: 0 个文件(本地 ./pages/ 已清空)`);
    return;
  }

  // 6. 并发下载(MAX_CONCURRENCY 上限)
  // 用全部任务跑一次 runWithLimit 不可行(只跑一个 worker),
  // 这里手写一个轻量并发调度:维护一个游标与活跃槽
  let nextIndex = 0;
  let completed = 0;
  let failed = null;
  const total = entries.length;

  const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, total) }, async () => {
    while (!failed) {
      const i = nextIndex++;
      if (i >= total) return;
      const relPath = entries[i];
      const relNoPrefix = relPath.slice(WEBDAV_PREFIX.length + 1);
      const localPath = path.join(LOCAL_DIR, relNoPrefix);
      try {
        const dir = path.dirname(localPath);
        await fs.mkdir(dir, { recursive: true });
        const raw = await client.getFileContents(relPath);
        const content = normalizeWebDavContent(raw);
        if (!content) {
          throw new Error(`WebDAV 文件内容为空: ${relPath}`);
        }
        await fs.writeFile(localPath, content, 'utf8');
        completed += 1;
        if (completed % 25 === 0 || completed === total) {
          console.log(`${LOG_PREFIX} 进度: ${completed}/${total}`);
        }
      } catch (err) {
        failed = err;
        throw err;
      }
    }
  });

  try {
    await Promise.all(workers);
  } catch (err) {
    fail('download pages', err);
  }

  console.log(`${LOG_PREFIX} 同步完成: ${total} 个文件 → ${path.relative(PROJECT_ROOT, LOCAL_DIR)}/`);
}

main().catch((err) => {
  // 兜底:任何 main 路径上的未捕获错误,统一以失败退出
  const e = err instanceof Error ? err : new Error(String(err));
  console.error(`${LOG_PREFIX} 未捕获错误: ${e.message}`);
  if (e.stack) {
    console.error(e.stack.split('\n').slice(0, 5).join('\n'));
  }
  process.exit(1);
});
