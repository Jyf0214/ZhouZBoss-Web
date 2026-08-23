#!/usr/bin/env node

/**
 * 构建时路由过滤脚本
 *
 * 支持两种过滤模式：
 *
 * 1. 静态导出部署（NEXT_STATIC_EXPORT=true 或 GITHUB_PAGES=true）：
 *    移除所有 API 路由，因为静态导出只支持静态 HTML 部署，
 *    无法运行动态 API 路由。判断源与 next.config.ts 的导出开关同源，
 *    避免出现"导出开关已开、过滤分支未触发"的错位。
 *
 * 2. 无数据库部署（无 DATABASE_URL 等环境变量）：
 *    移除后台相关路由目录，只保留博客帖子路由。
 *
 * 被移除的路由：
 *   - app/dashboard/          仪表盘
 *   - app/login/              登录
 *   - app/forgot-password/    密码重置
 *   - app/reset-password/     密码修改
 *   - app/diary/              日记
 *   - app/faces/              人物/联系人
 *   - app/editor/             编辑器
 *   - app/files/              文件管理
 *   - app/api/auth/           认证 API
 *   - app/api/admin/          管理 API
 *   - app/api/diary/          日记 API
 *   - app/api/faces/          人物 API
 *   - app/api/user/           用户信息 API
 *   - app/api/users/          用户列表 API
 *   - app/api/github/         GitHub 同步 API
 *   - app/api/articles/       文章 API
 *   - app/api/storage/        文件存储 API
 *   - app/api/posts/          点赞 API
 *   - app/api/health/         健康检查 API
 *   - app/api/cleanup         清理 API
 *   - app/api/feedback        反馈 API
 *
 * 有数据库时直接退出，不做任何操作。
 * 构建完成后由 restore-db-routes.mjs 恢复。
 */

import { existsSync, renameSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.cwd();
const DISABLED_DIR = join(ROOT, '.disabled-routes');
const MANIFEST = join(DISABLED_DIR, '.manifest.json');

/**
 * 从 .env.local 加载环境变量（脚本在 next build 之前运行，.env.local 尚未自动加载）
 * 仅解析简单 KEY=VALUE 格式，忽略注释和空行
 */
function loadEnvLocal() {
  const envPath = join(ROOT, '.env.local');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // 去除引号包裹
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // 不覆盖已有的环境变量（CI 中的优先级更高）
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

/** 需要在无数据库时移除的路由目录（相对于 ROOT） */
const DB_ROUTE_PATHS = [
  // ── 后台管理 ──
  'src/app/dashboard',
  'src/app/login',
  'src/app/forgot-password',
  'src/app/reset-password',
  // ── 认证依赖（日记、人物、编辑器） ──
  'src/app/diary',
  'src/app/faces',
  'src/app/editor',
  // ── 存储 / 文件管理 ──
  'src/app/files',
  // ── API：认证 / 管理 ──
  'src/app/api/auth',
  'src/app/api/admin',
  // ── API：认证依赖 ──
  'src/app/api/diary',
  'src/app/api/faces',
  'src/app/api/user',
  'src/app/api/users',
  // ── API：依赖数据库的配置/检索类（无库时无法工作，且使用 cookies 无法静态导出） ──
  'src/app/api/config',
  'src/app/api/backlinks',
  'src/app/api/wiki-link-map',
  'src/app/api/env-status',
  'src/app/api/cleanup',
  'src/app/api/feedback',
  'src/app/api/github',
  'src/app/api/articles',
  'src/app/api/storage',
  'src/app/api/posts',
  'src/app/api/health',
];

/** 需要在 GitHub Pages 部署时移除的路由目录（相对于 ROOT）
 *
 * 项目有大量动态路由（缺少 generateStaticParams 或设置了 force-dynamic），
 * 在 output: export 模式下全部会报错。
 * 直接移除所有无法静态化的路由目录。
 */
const GITHUB_PAGES_REMOVE_PATHS = [
  // ── 整个 API 目录 ──
  'src/app/api',
  // ── 需要运行时服务的页面路由 ──
  'src/app/files',
  'src/app/diary',
  'src/app/faces',
  'src/app/dashboard',
  'src/app/login',
  'src/app/forgot-password',
  'src/app/reset-password',
  'src/app/editor',
  // ── 私有帖子页（使用 cookies，无法静态导出） ──
  'src/app/posts/private',
];

function hasDatabase() {
  return !!process.env.DATABASE_URL;
}

// 全量移除分支的触发源与 next.config.ts 的静态导出开关同源。
// 历史 bug：此处仅认 GITHUB_PAGES，而 Pages workflow 只设置 NEXT_STATIC_EXPORT，
// 导致生产构建走错分支、使用 cookies 的路由残留进 export 构建而必败
function isStaticExportMode() {
  return process.env.NEXT_STATIC_EXPORT === 'true' || process.env.GITHUB_PAGES === 'true';
}

// 先加载 .env.local，确保本地数据库环境变量可用
loadEnvLocal();

// 决定过滤模式
const isGH = isStaticExportMode();
const hasDB = hasDatabase();

if (!isGH && hasDB) {
  // 非 GitHub Pages 且有数据库，不操作
  console.log('[filter-db-routes] 检测到数据库环境变量，跳过路由过滤');
  process.exit(0);
}

if (!existsSync(DISABLED_DIR)) {
  mkdirSync(DISABLED_DIR, { recursive: true });
}

const manifest = [];
let moved = 0;

if (isGH) {
  // 静态导出部署：移除所有无法静态化的路由（output: export 不支持动态路由）
  console.log('[filter-db-routes] 检测到静态导出部署，移除动态路由目录...');

  for (const relPath of GITHUB_PAGES_REMOVE_PATHS) {
    const src = join(ROOT, relPath);
    if (!existsSync(src)) continue;

    // 平铺存放：.disabled-routes/app__api__auth → app/api/auth
    const flatName = relPath.replace(/\//g, '__');
    const dest = join(DISABLED_DIR, flatName);

    // 清理可能残留的旧目标目录（上次构建未恢复时会残留）
    if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });

    renameSync(src, dest);
    manifest.push({ original: relPath, stored: flatName });
    console.log(`  移除: ${relPath}`);
    moved++;
  }
} else {
  // 无数据库部署：移除后台路由目录
  console.log('[filter-db-routes] 未检测到数据库环境变量，移除后台路由目录...');

  for (const relPath of DB_ROUTE_PATHS) {
    const src = join(ROOT, relPath);
    if (!existsSync(src)) continue;

    // 平铺存放：.disabled-routes/app__dashboard → app/dashboard
    const flatName = relPath.replace(/\//g, '__');
    const dest = join(DISABLED_DIR, flatName);

    // 清理可能残留的旧目标目录（上次构建未恢复时会残留）
    if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });

    renameSync(src, dest);
    manifest.push({ original: relPath, stored: flatName });
    console.log(`  移除: ${relPath}`);
    moved++;
  }
}

if (moved > 0) {
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log(`[filter-db-routes] 共移除 ${moved} 个路由目录`);
} else {
  console.log('[filter-db-routes] 无需移除的路由目录');
}
