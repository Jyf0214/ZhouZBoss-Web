#!/usr/bin/env node

/**
 * Bundle 体积阈值检查脚本
 *
 * 读取 @next/bundle-analyzer 在 ANALYZE=true 构建时生成的 .next/analyze/client.json,
 * 遍历树形结构求和客户端 gzip 总体积, 与 .bundle-size.json 中的阈值比较。
 *
 * 用法:
 *   node scripts/check-bundle-size.mjs
 *   npm run bundle-check        (需先执行 ANALYZE=true next build)
 *
 * 退出码:
 *   0 — 通过
 *   1 — 体积超出硬上限
 *   2 — 分析报告不存在或格式异常
 */

import {readFileSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ---------- 工具函数 ----------

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
}

/** 递归遍历 webpack-bundle-analyzer 图表数据, 求和顶层 gzip 体积 */
function sumTopLevelGzip(nodes) {
  if (!Array.isArray(nodes)) return 0;
  return nodes.reduce((total, node) => total + (node.gzipSize || 0), 0);
}

/** 递归遍历获取所有叶节点的最大单文件 gzip 体积 */
function findMaxGzip(nodes) {
  let max = {label: '', gzipSize: 0};
  if (!Array.isArray(nodes)) return max;

  for (const node of nodes) {
    if (node.gzipSize > max.gzipSize && !node.groups) {
      max = {label: node.label, gzipSize: node.gzipSize};
    }
    if (node.groups) {
      const child = findMaxGzip(node.groups);
      if (child.gzipSize > max.gzipSize) max = child;
    }
  }
  return max;
}

/** 递归遍历, 收集所有超过阈值的叶节点 */
function collectLargeModules(nodes, threshold, prefix = '') {
  const results = [];
  if (!Array.isArray(nodes)) return results;

  for (const node of nodes) {
    const path = prefix ? `${prefix} > ${node.label}` : node.label;
    if (!node.groups && node.gzipSize > threshold) {
      results.push({label: path, gzipSize: node.gzipSize});
    }
    if (node.groups) {
      results.push(...collectLargeModules(node.groups, threshold, path));
    }
  }
  return results;
}

// ---------- 主逻辑 ----------

const analyzeReportPath = resolve(ROOT, '.next', 'analyze', 'client.json');
const configPath = resolve(ROOT, '.bundle-size.json');

// 1. 检查分析报告是否存在
if (!existsSync(analyzeReportPath)) {
  console.error(
    `\x1b[31m✖ 未找到 bundle 分析报告: ${analyzeReportPath}\x1b[0m\n` +
      `  请先运行 \x1b[33mANALYZE=true next build\x1b[0m 或 \x1b[33mnpm run analyze\x1b[0m 生成报告。`,
  );
  process.exit(2);
}

// 2. 读取配置
let config = {
  thresholds: {
    clientGzipTotal: 524288,       // 512 KB
    warningClientGzipTotal: 460800, // 450 KB
  },
};

if (existsSync(configPath)) {
  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
    config = {...config, ...raw};
  } catch (err) {
    console.warn(`\x1b[33m⚠ 解析 ${configPath} 失败, 使用默认阈值: ${err.message}\x1b[0m`);
  }
}

const {clientGzipTotal: hardLimit, warningClientGzipTotal: warnLimit} = config.thresholds;

// 3. 解析分析报告
let chartData;
try {
  chartData = JSON.parse(readFileSync(analyzeReportPath, 'utf-8'));
} catch (err) {
  console.error(`\x1b[31m✖ 解析分析报告失败: ${err.message}\x1b[0m`);
  process.exit(2);
}

// chartData 可能是数组(顶层 chunks)或对象(单个 chunk)
const nodes = Array.isArray(chartData) ? chartData : [chartData];
const totalGzip = sumTopLevelGzip(nodes);
const maxModule = findMaxGzip(nodes);

// 4. 输出报告
console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║            📦  Bundle 体积检查报告                     ║');
console.log('╠══════════════════════════════════════════════════════════╣');
console.log(`║  客户端 gzip 总体积 : ${formatBytes(totalGzip).padEnd(35)}║`);
console.log(`║  硬上限             : ${formatBytes(hardLimit).padEnd(35)}║`);
console.log(`║  警告线             : ${formatBytes(warnLimit).padEnd(35)}║`);
console.log('╠══════════════════════════════════════════════════════════╣');

if (maxModule.gzipSize > 0) {
  console.log(`║  最大单模块 gzip    : ${formatBytes(maxModule.gzipSize).padEnd(35)}║`);
  console.log(`║  模块名称           : ${maxModule.label.slice(0, 35).padEnd(35)}║`);
}

// 列出超过警告线 50% 的大模块
const largeModules = collectLargeModules(nodes, warnLimit * 0.5);
if (largeModules.length > 0) {
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  ⚠  较大模块 (>225KB gzip):                            ║');
  for (const mod of largeModules.slice(0, 5)) {
    const line = `    ${formatBytes(mod.gzipSize).padStart(10)}  ${mod.label}`;
    console.log(`║  ${line.slice(0, 55).padEnd(55)}║`);
  }
}

console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');

// 5. 判定结果
if (totalGzip > hardLimit) {
  console.error(
    `\x1b[31m✖ 客户端 gzip 总体积 ${formatBytes(totalGzip)} 超出硬上限 ${formatBytes(hardLimit)}\x1b[0m`,
  );
  console.error('  请优化 bundle 体积后重试。如确需调整阈值, 请修改 .bundle-size.json。');
  process.exit(1);
}

if (totalGzip > warnLimit) {
  console.warn(
    `\x1b[33m⚠ 客户端 gzip 总体积 ${formatBytes(totalGzip)} 超过警告线 ${formatBytes(warnLimit)}\x1b[0m`,
  );
  console.warn('  建议优化 bundle 体积, 但本次检查仍视为通过。');
}

console.log(`\x1b[32m✔ Bundle 体积检查通过 (${formatBytes(totalGzip)} / ${formatBytes(hardLimit)})\x1b[0m`);
