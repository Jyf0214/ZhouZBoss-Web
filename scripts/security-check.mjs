#!/usr/bin/env node

/**
 * 安全检查脚本
 * 扫描暂存区文件中的敏感信息
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// 敏感信息模式
const SENSITIVE_PATTERNS = [
  { name: 'API Key', pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"]?[a-zA-Z0-9_-]{20,}['"]?/gi },
  { name: 'Secret', pattern: /(?:secret|password|token)\s*[:=]\s*(?:['"][^'"]{20,}['"]|[a-zA-Z0-9_-]*[0-9][a-zA-Z0-9_-]{19,})(?!\s*\))/gi },
  { name: 'Private Key', pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi },
  { name: 'Database URL', pattern: /(?:mongodb|postgres|mysql):\/\/[^\s'"]+/gi },
  { name: 'AWS Key', pattern: /AKIA[0-9A-Z]{16}/g },
  { name: 'GitHub Token', pattern: /ghp_[a-zA-Z0-9]{36}/g },
  { name: 'JWT Token', pattern: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g },
];

// 排除的文件
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /package-lock\.json/,
  /yarn\.lock/,
  /pnpm-lock\.yaml/,
  /\.env\./,
  /\.env\.example/,
  /dist/,
  /build/,
  /coverage/,
];

function isExcluded(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];

  SENSITIVE_PATTERNS.forEach(({ name, pattern }) => {
    const matches = content.match(pattern);
    if (matches) {
      issues.push({
        type: name,
        count: matches.length,
        sample: matches[0].substring(0, 50) + '...',
      });
    }
  });

  return issues;
}

function main() {
  try {
    // 获取暂存区文件
    const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
      .split('\n')
      .filter(Boolean);

    if (stagedFiles.length === 0) {
      console.warn('⚠️  没有暂存文件，跳过安全检查');
      return;
    }

    console.warn(`🔍 检查 ${stagedFiles.length} 个暂存文件...`);

    let hasIssues = false;

    stagedFiles.forEach(filePath => {
      if (isExcluded(filePath)) {
        return;
      }

      const fullPath = path.join(process.cwd(), filePath);

      if (!fs.existsSync(fullPath)) {
        return;
      }

      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) {
        return;
      }

      try {
        const issues = checkFile(fullPath);
        if (issues.length > 0) {
          hasIssues = true;
          console.warn(`\n❌ ${filePath}:`);
          issues.forEach(issue => {
            console.warn(`   - ${issue.type}: 发现 ${issue.count} 处`);
            console.warn(`     示例: ${issue.sample}`);
          });
        }
      } catch {
        // 忽略无法读取的文件
      }
    });

    if (hasIssues) {
      console.warn('\n❌ 发现敏感信息，请检查并移除后再提交！');
      process.exit(1);
    }

    console.warn('✅ 安全检查通过！');
  } catch (err) {
    console.error('安全检查失败:', err.message);
    process.exit(1);
  }
}

main();
