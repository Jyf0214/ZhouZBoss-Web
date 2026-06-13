#!/usr/bin/env node
// 屏蔽第三方 CLI 噪音(预留,与 scripts/db-init.mjs 风格保持一致)
process.env.PRISMA_HIDE_PREVIEW_FLAG_WARNINGS = 'true';
process.env.PRISMA_HIDE_UPDATE_MESSAGE = 'true';

/**
 * 构建期同步脚本 — 把远端存储(pages/)完整镜像到本地 `./pages/`
 *
 * 触发链:
 *   `npm run build` → `prebuild` → `npm run sync:pages` → 本脚本 → `next build`
 *
 * 存储后端(通过 STORAGE_TYPE 环境变量切换):
 *   - 'webdav'(默认):使用 webdav 客户端连接 WebDAV 服务器
 *   - 'backblaze':使用 fetch() 调用 B2 原生 API (无新依赖)
 *
 * 行为契约(与设计文档一致):
 *   1. 存储未配置(缺必要环境变量):
 *      - 清空本地 `./pages/`(`fs.rm` recursive + force)
 *      - 以 exit 0 退出
 *      - 运行时索引页 /page 看到空目录,展示「暂无可用页面」
 *   2. 存储已配置:
 *      - 浅层扫描远端 `pages/` 根 + 1 级子目录(2 层)
 *      - 完全镜像:先 `fs.rm` 清空本地,再逐个下载写入
 *      - 任何 await 失败 → console.error 打印上下文 + process.exit(1)
 *   3. 容错分支(Vercel 构建友好):
 *      - 远端 `pages/` 不存在(404)或返回空数组 →
 *        自动在远端创建必需结构,让 build 继续(exit 0)
 *      - 其他真实错误(鉴权失败 / 网络超时 / 5xx)继续抛出 → fail
 *   4. 退出码:
 *      - 0:成功(含存储未配置场景 + 远端目录缺失/空场景)
 *      - 1:任意阶段(网络 / 鉴权 / IO)失败
 *
 * 设计要点:
 *   - 纯 Node ESM(.mjs),无新依赖(与 scripts/db-init.mjs 风格一致)
 *   - 不引入 p-limit,自写一个简单信号量(MAX_CONCURRENCY = 8)
 *   - 复用 `lib/page-source/normalize-webdav.mjs` 的归一化函数,
 *     避免与 lib/page-source/shared.ts 中的 TS 版本漂移
 */

import { promises as fs } from 'fs';
import path from 'path';
import https from 'https';
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
 * 容错分支:远端必须存在的子目录清单
 *
 * 推断依据:
 * - 本脚本唯一依赖的远端前缀是 `WEBDAV_PREFIX = 'pages'`(见上方常量)
 * - 项目其他远端路径(`app/api/storage/**` / `app/files/**`)都是
 *   管理员 / 用户在 `/admin/storage` 页面动态创建的,没有固定子目录约定
 * - 因此,本脚本职责范围内「必需存在的文件夹」只有 `pages/` 这一个
 *
 * 数组按依赖顺序排列:父目录先于子目录。当前只有根这一层,后续若新增
 * 子目录(例如 `pages/blog/`),把更深的路径追加到数组末尾即可。
 */
const REQUIRED_DIRS = [WEBDAV_PREFIX];

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
 * 从任意错误对象中读取 HTTP 状态码,兼容多种客户端的错误形态
 *
 * - `err.status`:顶层属性
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
 * 同步清空并重建本地 pages/ 目录
 */
async function resetLocalPages() {
  try {
    await fs.rm(LOCAL_DIR, { recursive: true, force: true });
    await fs.mkdir(LOCAL_DIR, { recursive: true });
  } catch (err) {
    fail('reset local pages/', err);
  }
}

/**
 * 并发下载全部文件到本地 pages/
 *
 * @param {string[]} entries 远端文件路径列表(如 ['pages/index.html', 'pages/blog/post.html'])
 * @param {(entry: string) => Promise<Buffer | string>} downloader 下载单个文件的函数
 */
async function downloadAll(entries, downloader) {
  let nextIndex = 0;
  let completed = 0;
  let downloadErrors = 0;
  let corruptedFiles = 0;
  const total = entries.length;
  const MAX_RETRIES = 3;

  const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, total) }, async () => {
    while (true) {
      const i = nextIndex++;
      if (i >= total) return;
      const relPath = entries[i];
      const relNoPrefix = relPath.slice(WEBDAV_PREFIX.length + 1);
      const localPath = path.join(LOCAL_DIR, relNoPrefix);

      let lastErr = null;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const raw = await downloader(relPath);
          const content = normalizeWebDavContent(raw);
          if (!content) {
            throw new Error(`文件内容为空: ${relPath}`);
          }
          const dir = path.dirname(localPath);
          await fs.mkdir(dir, { recursive: true });
          await fs.writeFile(localPath, content, 'utf8');
          completed += 1;
          lastErr = null;
          if (completed % 25 === 0 || completed === total) {
            console.log(`${LOG_PREFIX} 进度: ${completed}/${total}`);
          }
          break;
        } catch (err) {
          lastErr = err;
          const status = err.status ?? err.statusCode ?? 'unknown';
          const errName = err.name ?? 'Error';
          console.warn(`${LOG_PREFIX} ⚠️ 下载失败(第${attempt + 1}/${MAX_RETRIES}次): ${relPath}`);
          console.warn(`${LOG_PREFIX}   错误类型: ${errName}, HTTP状态: ${status}`);
          console.warn(`${LOG_PREFIX}   错误消息: ${err.message}`);
          if (attempt < MAX_RETRIES - 1) {
            const delayMs = 1000 * (attempt + 1);
            console.log(`${LOG_PREFIX}   ${delayMs}ms 后重试...`);
            await new Promise((r) => setTimeout(r, delayMs));
          }
        }
      }
      if (lastErr) {
        downloadErrors += 1;
        console.warn(`${LOG_PREFIX} ⚠️ 跳过(重试${MAX_RETRIES}次): ${relPath} (${lastErr.message})`);
      }
    }
  });

  await Promise.all(workers);

  // 所有文件下载失败时才终止构建
  if (downloadErrors > 0 && completed === 0) {
    console.error(`${LOG_PREFIX} ❌ 全部 ${downloadErrors} 个文件下载失败,构建终止`);
    process.exit(1);
  } else if (downloadErrors > 0) {
    console.warn(`${LOG_PREFIX} ⚠️ ${downloadErrors} 个文件失败已跳过,${completed}/${total} 成功`);
  }

  console.log(`${LOG_PREFIX} 同步完成: ${total} 个文件 → ${path.relative(PROJECT_ROOT, LOCAL_DIR)}/`);
}

// ─── HTTPS 下载工具 ────────────────────────────────────────────────────────

/**
 * 通过 Node.js 原生 HTTPS 下载 WebDAV 文件
 *
 * 绕过 webdav 库的 fetch 实现(Koofr 在 Vercel 环境下 fetch body 会 abort)。
 * 与 app/files/[...path]/route.ts 的 HTTPS 回退策略一致。
 *
 * @param {string} baseUrls WebDAV 服务器基础 URL
 * @param {string} relPath 文件相对路径(如 'pages/hello-world/index.html')
 * @param {string} auth Basic auth header 值
 * @param {number} timeoutMs 超时毫秒数
 * @returns {Promise<Buffer>} 文件内容
 */
function downloadViaHttps(baseUrls, relPath, auth, timeoutMs) {
  return new Promise((resolve, reject) => {
    const encoded = relPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
    const url = `${baseUrls}/${encoded}`;

    const req = https.get(url, {
      headers: {
        Authorization: auth,
        Accept: '*/*',
      },
      timeout: timeoutMs,
    }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTPS download failed: HTTP ${res.statusCode} ${relPath}`));
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`HTTPS download timeout: ${relPath}`));
    });
  });
}

// ─── WebDAV 后端 ───────────────────────────────────────────────────────────

/**
 * 单层 `getDirectoryContents` 包装:用于子目录扫描
 *
 * - 子目录 404 → 记录警告,返回空数组(跳过该目录,不阻断构建)
 * - 其他异常 → fail 终止构建
 */
async function webdavListDir(client, dir) {
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
 * - 返回 `null`:WebDAV 返回 404(目录不存在),由调用方进入自动建仓分支
 * - 返回 `[]`:目录存在但为空(由调用方同样视为需要容错)
 * - 返回数组:正常列表
 * - 其他异常(鉴权 / 网络 / 5xx)继续抛
 */
async function webdavListRootDir(client) {
  try {
    return await client.getDirectoryContents(WEBDAV_PREFIX, { deep: false });
  } catch (err) {
    const status = readErrorStatus(err);
    if (status === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * 浅层递归(2 层)收集 `pages/` 下所有 .html/.htm 路径(WebDAV)
 *
 * @returns {Promise<string[] | null>} 形如 ['pages/index.html', 'pages/blog/post.html'];
 *   根目录缺失(404)时返回 `null`
 */
async function webdavListHtmlRecursive(client) {
  const rootEntries = await webdavListRootDir(client);
  if (rootEntries === null) {
    return null;
  }

  const out = [];
  for (const entry of rootEntries) {
    const name = entry.filename.split('/').pop() || entry.filename;
    if (entry.type === 'file' && /\.html?$/i.test(name)) {
      out.push(`${WEBDAV_PREFIX}/${name}`);
      continue;
    }
    if (entry.type === 'directory') {
      const subPath = `${WEBDAV_PREFIX}/${name}`;
      const subEntries = await webdavListDir(client, subPath);
      for (const sub of subEntries) {
        const subName = sub.filename.split('/').pop() || sub.filename;
        if (sub.type === 'file' && /\.html?$/i.test(subName)) {
          out.push(`${subPath}/${subName}`);
        }
      }
    }
  }
  return out;
}

/**
 * 容错分支:在 WebDAV 远端自动创建必需目录结构,然后清空本地镜像,build 继续
 */
async function webdavBootstrapAndExit(client) {
  console.log(`${LOG_PREFIX} 检测到 WebDAV 目标目录缺失或为空,开始自动创建必需结构`);
  let allFailed = true;
  for (const dir of REQUIRED_DIRS) {
    try {
      await client.createDirectory(dir, { recursive: true });
      console.log(`${LOG_PREFIX} ✅ 已创建 WebDAV 目录: ${dir}`);
      allFailed = false;
    } catch (err) {
      const status = readErrorStatus(err);
      if (status === 405 || status === 301 || status === 200) {
        console.log(`${LOG_PREFIX} ✅ WebDAV 目录已存在: ${dir}`);
        allFailed = false;
      } else {
        console.error(`${LOG_PREFIX} ❌ 自动创建 WebDAV 目录失败: ${dir} (${err.message})`);
      }
    }
  }
  if (allFailed) {
    console.error(`${LOG_PREFIX} ❌ 所有必需目录创建失败,构建终止`);
    process.exit(1);
  }
  console.log(`${LOG_PREFIX} ℹ️ 目标目录原本缺失,已自动创建必需结构,build 继续`);

  try {
    await fs.rm(LOCAL_DIR, { recursive: true, force: true });
    await fs.mkdir(LOCAL_DIR, { recursive: true });
  } catch (err) {
    console.warn(`${LOG_PREFIX} ⚠️ 清空本地 ./pages/ 失败: ${err.message}`);
  }

  process.exit(0);
}

/**
 * WebDAV 同步主路径
 */
async function syncFromWebdav() {
  const url = process.env.WEBDAV_URL;
  const user = process.env.WEBDAV_USER;
  const pass = process.env.WEBDAV_PASS;

  if (!url || !user || !pass) {
    console.log(`${LOG_PREFIX} WebDAV 未配置(WEBDAV_URL/USER/PASS 任一缺失),清空 ./pages/ 后跳过`);
    try {
      await fs.rm(LOCAL_DIR, { recursive: true, force: true });
    } catch (err) {
      fail('rm local pages/ (unconfigured path)', err);
    }
    return;
  }

  let client;
  try {
    client = createClient(url, { username: user, password: pass });
  } catch (err) {
    fail('create webdav client', err);
  }

  let entries;
  try {
    entries = await webdavListHtmlRecursive(client);
  } catch (err) {
    fail('list html recursive', err);
  }

  if (entries === null) {
    await webdavBootstrapAndExit(client);
    return;
  }

  if (entries.length === 0) {
    console.log(`${LOG_PREFIX} WebDAV pages/ 目录存在但无 HTML 文件`);
    await resetLocalPages();
    return;
  }

  console.log(`${LOG_PREFIX} WebDAV pages/ 共发现 ${entries.length} 个 HTML 文件`);

  await resetLocalPages();

  // 并发下载:使用 Node.js 原生 https 下载(webdav 库的 fetch 在 Koofr 上会 abort)
  const DOWNLOAD_TIMEOUT_MS = 30_000;
  const webdavUrl = process.env.WEBDAV_URL.replace(/\/+$/, '');
  const auth = `Basic ${Buffer.from(`${process.env.WEBDAV_USER}:${process.env.WEBDAV_PASS}`).toString('base64')}`;

  await downloadAll(entries, async (relPath) => {
    return downloadViaHttps(webdavUrl, relPath, auth, DOWNLOAD_TIMEOUT_MS);
  });
}

// ─── Backblaze B2 后端 ─────────────────────────────────────────────────────

/** B2 鉴权结果缓存(脚本生命周期内复用) */
let _b2Auth = null;

/**
 * B2 获取 bucket ID（根据 bucket name 查询）
 *
 * 当 b2_authorize_account 的 allowed.buckets 为空时（"所有 bucket"权限），
 * 需要额外调用 b2_list_buckets 来获取 bucket ID。
 */
async function b2ResolveBucketId(authToken, apiUrl, bucketName) {
  // 先尝试从鉴权响应中获取
  if (_b2AuthorizeData?.allowed?.buckets?.length > 0) {
    const found = _b2AuthorizeData.allowed.buckets.find((b) => b.bucketName === bucketName);
    if (found) return found.bucketId;
  }

  // 回退:调用 b2_list_buckets 列出所有 bucket
  const resp = await fetch(`${apiUrl}/b2api/v3/b2_list_buckets`, {
    method: 'POST',
    headers: {
      Authorization: authToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!resp.ok) {
    throw new Error(`B2 列出 bucket 失败(HTTP ${resp.status})`);
  }

  const data = await resp.json();
  const buckets = data.buckets ?? [];
  const found = buckets.find((b) => b.bucketName === bucketName);
  if (!found) {
    const names = buckets.map((b) => `"${b.bucketName}"`).join(', ');
    throw new Error(
      `B2 bucket "${bucketName}" 不存在,可用 bucket: [${names || '无'}]`
    );
  }

  return found.bucketId;
}

/** 缓存 b2_authorize_account 的完整响应（用于 b2ResolveBucketId） */
let _b2AuthorizeData = null;

/**
 * B2 鉴权:POST 到 b2_authorize_account
 *
 * @returns {Promise<{ apiUrl: string, downloadUrl: string, authorizationToken: string, bucketId: string }>}
 */
async function b2Authorize() {
  if (_b2Auth) return _b2Auth;

  const keyId = process.env.B2_KEY_ID;
  const appKey = process.env.B2_APP_KEY;
  const bucketName = process.env.B2_BUCKET;

  if (!keyId || !appKey || !bucketName) {
    throw new Error('B2 环境变量缺失(B2_KEY_ID / B2_APP_KEY / B2_BUCKET)');
  }

  const credentials = Buffer.from(`${keyId}:${appKey}`).toString('base64');

  const resp = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
    method: 'GET',
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`B2 鉴权失败(HTTP ${resp.status}): ${body.slice(0, 500)}`);
  }

  const data = await resp.json();

  // 缓存完整响应供 b2ResolveBucketId 使用
  _b2AuthorizeData = data;

  // B2 API v3/v4 响应中 apiUrl 可能在 apiInfo.storageApi.apiUrl
  // 兼容两种格式
  const resolvedApiUrl = data.apiUrl || data.apiInfo?.storageApi?.apiUrl || data.s3ApiUrl;
  const resolvedDownloadUrl = process.env.B2_DOWNLOAD_URL || data.downloadUrl || data.apiInfo?.storageApi?.downloadUrl;

  if (!resolvedApiUrl) {
    throw new Error(
      'B2 鉴权响应缺少 apiUrl,响应字段: ' +
        Object.keys(data).filter(k => typeof data[k] === 'string').join(', ')
    );
  }

  // 通过 bucket name 查找 bucketId
  const bucketId = await b2ResolveBucketId(
    data.authorizationToken,
    resolvedApiUrl,
    bucketName
  );

  _b2Auth = {
    apiUrl: resolvedApiUrl,
    downloadUrl: resolvedDownloadUrl,
    authorizationToken: data.authorizationToken,
    bucketId,
    bucketName,
  };

  console.log(`${LOG_PREFIX} B2 鉴权成功: bucket="${bucketName}" id=${bucketId}`);
  return _b2Auth;
}

/**
 * B2 清除鉴权缓存并重新鉴权(用于 401 重试)
 */
function b2ClearAuth() {
  _b2Auth = null;
  _b2AuthorizeData = null;
}

/**
 * B2 列出文件:POST b2_list_file_names
 *
 * @param {string} prefix 前缀(如 'pages/')
 * @param {string} [delimiter='/'] 分隔符
 * @returns {Promise<{ files: Array<{ fileName: string }>, folders: string[] }>}
 */
async function b2ListFiles(prefix, delimiter = '/') {
  const auth = await b2Authorize();

  const resp = await fetch(`${auth.apiUrl}/b2api/v3/b2_list_file_names`, {
    method: 'POST',
    headers: {
      Authorization: auth.authorizationToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bucketId: auth.bucketId,
      prefix,
      delimiter,
      maxFileCount: 10000,
    }),
  });

  if (resp.status === 401) {
    b2ClearAuth();
    // 重新鉴权后重试一次
    const auth2 = await b2Authorize();
    const resp2 = await fetch(`${auth2.apiUrl}/b2api/v3/b2_list_file_names`, {
      method: 'POST',
      headers: {
        Authorization: auth2.authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucketId: auth2.bucketId,
        prefix,
        delimiter,
        maxFileCount: 10000,
      }),
    });
    if (!resp2.ok) {
      const body = await resp2.text().catch(() => '');
      throw new Error(`B2 list files 失败(HTTP ${resp2.status}): ${body.slice(0, 500)}`);
    }
    return resp2.json();
  }

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`B2 list files 失败(HTTP ${resp.status}): ${body.slice(0, 500)}`);
  }

  return resp.json();
}

/**
 * B2 下载文件内容
 *
 * 优先使用 B2_DOWNLOAD_URL(CDN 直链,无需 Authorization 头),
 * 否则回退到 apiUrl 直连(需 Authorization 头)
 *
 * @param {string} filePath B2 上的文件路径(如 'pages/index.html')
 * @returns {Promise<Buffer>} 文件内容
 */
async function b2DownloadFile(filePath) {
  const auth = await b2Authorize();
  const bucketPath = `${auth.bucketName}/${filePath}`;
  const useCdn = !!process.env.B2_DOWNLOAD_URL;

  let url;
  let headers = {};

  if (useCdn) {
    // CDN 直链格式: {download_url}/file/{bucket_name}/{path}
    url = `${auth.downloadUrl}/file/${bucketPath}`;
  } else {
    // API 直连格式: {apiUrl}/file/{bucket_name}/{path}
    url = `${auth.apiUrl}/file/${bucketPath}`;
    headers.Authorization = auth.authorizationToken;
  }

  const resp = await fetch(url, { headers, redirect: 'follow' });

  if (resp.status === 401 && !useCdn) {
    // API 直连鉴权过期:清缓存 → 重新鉴权 → 重试一次
    b2ClearAuth();
    const auth2 = await b2Authorize();
    const resp2 = await fetch(`${auth2.apiUrl}/file/${bucketPath}`, {
      headers: { Authorization: auth2.authorizationToken },
      redirect: 'follow',
    });
    if (!resp2.ok) {
      const body = await resp2.text().catch(() => '');
      throw new Error(`B2 download 失败(HTTP ${resp2.status}): ${body.slice(0, 200)}`);
    }
    const arrayBuf2 = await resp2.arrayBuffer();
    return Buffer.from(arrayBuf2);
  }

  if (resp.status === 404) {
    throw new Error(`B2 文件不存在(404): ${filePath}`);
  }

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`B2 download 失败(HTTP ${resp.status}): ${body.slice(0, 200)}`);
  }

  const arrayBuf = await resp.arrayBuffer();
  return Buffer.from(arrayBuf);
}

/**
 * B2 在远端创建"目录":上传一个 .keep 占位文件
 *
 * @param {string} dirPath 目录路径(如 'pages/')
 */
async function b2CreateDir(dirPath) {
  const auth = await b2Authorize();
  const normalized = dirPath.endsWith('/') ? dirPath : `${dirPath}/`;
  const keepFile = `${normalized}.keep`;

  // 获取上传授权
  const authResp = await fetch(`${auth.apiUrl}/b2api/v3/b2_get_upload_authorization`, {
    method: 'POST',
    headers: {
      Authorization: auth.authorizationToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bucketId: auth.bucketId,
      fileNamePrefix: keepFile,
    }),
  });

  if (authResp.status === 401) {
    b2ClearAuth();
    const auth2 = await b2Authorize();
    const authResp2 = await fetch(`${auth2.apiUrl}/b2api/v3/b2_get_upload_authorization`, {
      method: 'POST',
      headers: {
        Authorization: auth2.authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucketId: auth2.bucketId,
        fileNamePrefix: keepFile,
      }),
    });
    if (!authResp2.ok) {
      const body = await authResp2.text().catch(() => '');
      throw new Error(`B2 get upload auth 失败(HTTP ${authResp2.status}): ${body.slice(0, 200)}`);
    }
    const authData2 = await authResp2.json();
    const uploadResp2 = await fetch(authData2.uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: authData2.authorizationToken,
        'X-Bz-File-Name': keepFile,
        'Content-Type': 'application/octet-stream',
        'X-Bz-Content-Sha1': 'do_not_verify',
      },
      body: Buffer.alloc(0),
    });
    if (!uploadResp2.ok) {
      const body = await uploadResp2.text().catch(() => '');
      throw new Error(`B2 upload .keep 失败(HTTP ${uploadResp2.status}): ${body.slice(0, 200)}`);
    }
    return;
  }

  if (!authResp.ok) {
    const body = await authResp.text().catch(() => '');
    throw new Error(`B2 get upload auth 失败(HTTP ${authResp.status}): ${body.slice(0, 200)}`);
  }

  const authData = await authResp.json();

  const uploadResp = await fetch(authData.uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: authData.authorizationToken,
      'X-Bz-File-Name': keepFile,
      'Content-Type': 'application/octet-stream',
      'X-Bz-Content-Sha1': 'do_not_verify',
    },
    body: Buffer.alloc(0),
  });

  if (!uploadResp.ok) {
    const body = await uploadResp.text().catch(() => '');
    throw new Error(`B2 upload .keep 失败(HTTP ${uploadResp.status}): ${body.slice(0, 200)}`);
  }
}

/**
 * 浅层递归(2 层)收集 B2 `pages/` 下所有 .html/.htm 路径
 *
 * @returns {Promise<string[] | null>} 文件路径列表; 根目录缺失时返回 `null`
 */
async function b2ListHtmlRecursive() {
  // 列出根目录内容
  let rootData;
  try {
    rootData = await b2ListFiles(`${WEBDAV_PREFIX}/`);
  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('404') || msg.includes('not found')) {
      return null;
    }
    fail('b2 list root', err);
  }

  // B2 可能返回 { files: [...], folders: [...] } 或 { files: { files: [...], nextFileName: ... } }
  const rootFiles = rootData.files?.files || rootData.files || [];
  const rootFolders = rootData.folders || [];

  if (rootFiles.length === 0 && rootFolders.length === 0) {
    return null; // 空目录视为缺失,触发 bootstrap
  }

  const out = [];

  // 处理根级文件
  for (const f of rootFiles) {
    const name = f.fileName.split('/').pop();
    if (name && /\.html?$/i.test(name) && name !== '.keep') {
      out.push(`${WEBDAV_PREFIX}/${name}`);
    }
  }

  // 处理子目录(只下一层)
  for (const folder of rootFolders) {
    // folder 可能是 'pages/blog/' 或 'pages/blog'
    const folderName = folder.replace(`${WEBDAV_PREFIX}/`, '').replace(/\/$/, '');
    if (!folderName) continue;

    const subPrefix = `${WEBDAV_PREFIX}/${folderName}/`;
    let subData;
    try {
      subData = await b2ListFiles(subPrefix);
    } catch (err) {
      console.warn(`${LOG_PREFIX} ⚠️ B2 子目录扫描失败(跳过): ${subPrefix} → ${err.message}`);
      continue;
    }

    const subFiles = subData.files?.files || subData.files || [];
    for (const f of subFiles) {
      const subName = f.fileName.split('/').pop();
      if (subName && /\.html?$/i.test(subName) && subName !== '.keep') {
        out.push(`${WEBDAV_PREFIX}/${folderName}/${subName}`);
      }
    }
  }

  return out;
}

/**
 * 容错分支:在 B2 远端自动创建必需目录结构,然后清空本地镜像,build 继续
 */
async function b2BootstrapAndExit() {
  console.log(`${LOG_PREFIX} 检测到 B2 目标目录缺失或为空,开始自动创建必需结构`);
  let allFailed = true;
  for (const dir of REQUIRED_DIRS) {
    try {
      await b2CreateDir(dir);
      console.log(`${LOG_PREFIX} ✅ 已创建 B2 目录: ${dir}`);
      allFailed = false;
    } catch (err) {
      console.error(`${LOG_PREFIX} ❌ 自动创建 B2 目录失败: ${dir} (${err.message})`);
    }
  }
  if (allFailed) {
    console.error(`${LOG_PREFIX} ❌ 所有必需目录创建失败,构建终止`);
    process.exit(1);
  }
  console.log(`${LOG_PREFIX} ℹ️ 目标目录原本缺失,已自动创建必需结构,build 继续`);

  try {
    await fs.rm(LOCAL_DIR, { recursive: true, force: true });
    await fs.mkdir(LOCAL_DIR, { recursive: true });
  } catch (err) {
    console.warn(`${LOG_PREFIX} ⚠️ 清空本地 ./pages/ 失败: ${err.message}`);
  }

  process.exit(0);
}

/**
 * Backblaze B2 同步主路径
 */
async function syncFromB2() {
  // 1. 验证环境变量
  const keyId = process.env.B2_KEY_ID;
  const appKey = process.env.B2_APP_KEY;
  const bucket = process.env.B2_BUCKET;

  if (!keyId || !appKey || !bucket) {
    console.log(
      `${LOG_PREFIX} B2 未配置(B2_KEY_ID/B2_APP_KEY/B2_BUCKET 任一缺失),清空 ./pages/ 后跳过`
    );
    try {
      await fs.rm(LOCAL_DIR, { recursive: true, force: true });
    } catch (err) {
      fail('rm local pages/ (b2 unconfigured path)', err);
    }
    return;
  }

  // 2. 鉴权(提前触发,错误信息更清晰)
  try {
    await b2Authorize();
  } catch (err) {
    fail('b2 authorize', err);
  }

  // 3. 列出全部 HTML 路径
  let entries;
  try {
    entries = await b2ListHtmlRecursive();
  } catch (err) {
    fail('b2 list html recursive', err);
  }

  if (entries === null) {
    await b2BootstrapAndExit();
    return;
  }

  if (entries.length === 0) {
    console.log(`${LOG_PREFIX} B2 pages/ 目录存在但无 HTML 文件`);
    await resetLocalPages();
    return;
  }

  console.log(`${LOG_PREFIX} B2 pages/ 共发现 ${entries.length} 个 HTML 文件`);

  await resetLocalPages();

  // 4. 并发下载:使用 B2 下载函数
  await downloadAll(entries, (relPath) => b2DownloadFile(relPath));
}

// ─── 入口 ──────────────────────────────────────────────────────────────────

async function main() {
  const storageType = (process.env.STORAGE_TYPE || 'webdav').toLowerCase();

  if (storageType === 'backblaze') {
    console.log(`${LOG_PREFIX} 存储后端: Backblaze B2`);
    await syncFromB2();
  } else {
    // 默认 WebDAV,完全保持原有逻辑
    console.log(`${LOG_PREFIX} 存储后端: WebDAV`);
    await syncFromWebdav();
  }
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
