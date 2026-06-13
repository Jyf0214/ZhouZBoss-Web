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
 *   3. 容错分支(Vercel 构建友好,2026-06 增补):
 *      - 远端 `pages/` 不存在(WebDAV 404)或返回空数组 →
 *        自动通过 `createDirectory` 在远端创建必需结构,
 *        让 build 继续(exit 0),不再因「首次部署 / 远端空目录」失败
 *      - 其他真实错误(鉴权失败 / 网络超时 / 5xx)继续抛出 → fail
 *   4. 退出码:
 *      - 0:成功(含 WebDAV 未配置场景 + 远端目录缺失/空场景)
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

/**
 * 容错分支:WebDAV 远端必须存在的子目录清单
 *
 * 推断依据:
 * - 本脚本唯一依赖的 WebDAV 前缀是 `WEBDAV_PREFIX = 'pages'`(见上方常量)
 * - 项目其他 WebDAV 路径(`app/api/storage/**` / `app/files/**`)都是
 *   管理员 / 用户在 `/admin/storage` 页面动态创建的,没有固定子目录约定
 * - 因此,本脚本职责范围内「必需存在的文件夹」只有 `pages/` 这一个
 *
 * 数组按依赖顺序排列:父目录先于子目录。当前只有根这一层,后续若新增
 * 子目录(例如 `pages/blog/`),把更深的路径追加到数组末尾即可。
 */
const REQUIRED_WEBDAV_DIRS = [WEBDAV_PREFIX];

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
 * 从任意错误对象中读取 HTTP 状态码,兼容 webdav 客户端的多种错误形态
 *
 * - `err.status`:webdav 库 `WebDAVError` 的顶层属性
 * - `err.response.status`:fetch / Octokit 风格
 * - 取不到 → null
 */
function readErrorStatus(err) {
  if (!err || typeof err !== 'object') return null;
  const direct = err.status;
  if (typeof direct === 'number') return direct;
  const nested = err.response && err.response.status;
  if (typeof nested === 'number') return nested;
  return null;
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
 * 单层 `getDirectoryContents` 包装:用于子目录扫描
 *
 * - 子目录 404 → 记录警告,返回空数组(跳过该目录,不阻断构建)
 * - 其他异常 → fail 终止构建
 */
async function listDir(client, dir) {
  try {
    return await client.getDirectoryContents(dir, { deep: false });
  } catch (err) {
    const status = readErrorStatus(err);
    if (status === 404) {
      console.warn(`${LOG_PREFIX} ⚠️ 子目录不存在(跳过): ${dir}`);
      return [];
    }
    fail(`list ${dir}`, err);
  }
}

/**
 * 根目录 `pages/` 的 `getDirectoryContents` 包装:专门处理"远端尚未建仓"的容错
 *
 * - 返回 `null`:WebDAV 返回 404(目录不存在),由 `main()` 进入自动建仓分支
 * - 返回 `[]`:目录存在但为空(由 `main()` 同样视为需要容错)
 * - 返回数组:正常列表
 * - 其他异常(鉴权 / 网络 / 5xx)继续抛,由 `main()` 的 try/catch 兜底 fail
 */
async function listRootDir(client) {
  try {
    return await client.getDirectoryContents(WEBDAV_PREFIX, { deep: false });
  } catch (err) {
    const status = readErrorStatus(err);
    if (status === 404) {
      return null;
    }
    // 真实错误:继续抛,让 main() 的 catch 转 fail()
    throw err;
  }
}

/**
 * 浅层递归(2 层)收集 `pages/` 下所有 .html/.htm 路径
 *
 * @param {{ getDirectoryContents: (p: string, opts: object) => Promise<Array<{ type: 'file' | 'directory'; filename: string }>> }} client
 * @returns {Promise<string[] | null>} 形如 ['pages/index.html', 'pages/blog/post.html'] 的数组;
 *   根目录缺失(404)时返回 `null`
 */
async function listHtmlRecursive(client) {
  const rootEntries = await listRootDir(client);
  if (rootEntries === null) {
    // 根目录 404 → 交给 main() 进入自动建仓分支
    return null;
  }

  const out = [];
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

/**
 * 容错分支:在 WebDAV 远端自动创建项目必需的目录结构,然后清空本地镜像,build 继续。
 *
 * 行为细节:
 * - 按 `REQUIRED_WEBDAV_DIRS` 的依赖顺序(父目录先于子目录)依次创建
 * - 任一目录创建失败 → 记录错误但**继续创建其他目录**(尽力而为)
 *   - 405 / 301 / 200:WebDAV 服务器对"目录已存在"的常见返回,视作成功
 *   - 其他:仅 console.warn,不阻断流程
 * - 全部完成后,清空本地 `./pages/` 镜像保持一致,然后 `process.exit(0)`
 *
 * 为何这样设计:Vercel 构建链路(prebuild → build)是连续的,任何一次
 * 失败都会让 build 红;对于"远端是首次部署 / 远端目录被人为清空"这类
 * 应当自愈的场景,主动建仓比把错误抛回给 CI 更友好。
 */
async function bootstrapRemoteAndExit(client) {
  console.log(`${LOG_PREFIX} 检测到 WebDAV 目标目录缺失或为空,开始自动创建必需结构`);
  for (const dir of REQUIRED_WEBDAV_DIRS) {
    try {
      await client.createDirectory(dir, { recursive: true });
      console.log(`${LOG_PREFIX} ✅ 已创建 WebDAV 目录: ${dir}`);
    } catch (err) {
      const status = readErrorStatus(err);
      if (status === 405 || status === 301 || status === 200) {
        // "目录已存在"在不同 WebDAV 服务器上的常见返回码,视作成功
        console.log(`${LOG_PREFIX} ✅ WebDAV 目录已存在: ${dir}`);
      } else {
        // 真实失败(网络 / 鉴权 / 5xx):记录但继续创建其他目录
        console.warn(`${LOG_PREFIX} ⚠️ 自动创建 WebDAV 目录失败: ${dir} (${err.message})`);
      }
    }
  }
  console.log(`${LOG_PREFIX} ℹ️ 目标目录原本缺失,已自动创建必需结构,build 继续`);

  // 同步清空本地 pages/ 镜像,保持"远端有 / 本地空"的一致性
  try {
    await fs.rm(LOCAL_DIR, { recursive: true, force: true });
    await fs.mkdir(LOCAL_DIR, { recursive: true });
  } catch (err) {
    // best-effort:本地清空失败不阻断 build
    console.warn(`${LOG_PREFIX} ⚠️ 清空本地 ./pages/ 失败: ${err.message}`);
  }

  process.exit(0);
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
  //    - 根目录 404 → listHtmlRecursive 返回 null → 走 bootstrap 分支
  //    - 根目录返回 [] → 视为空目录 → 同样走 bootstrap 分支
  //    - 其他异常 → fail
  let entries;
  try {
    entries = await listHtmlRecursive(client);
  } catch (err) {
    fail('list html recursive', err);
  }

  if (entries === null || (Array.isArray(entries) && entries.length === 0)) {
    // 容错:远端 pages/ 缺失(404)或为空,自动建仓 + exit 0
    await bootstrapRemoteAndExit(client);
    return; // 不可达(bootstrap 内部已 process.exit(0))
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
