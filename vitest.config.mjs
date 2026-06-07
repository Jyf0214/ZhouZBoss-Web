import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    // 排除 Next.js standalone 构建产物中的测试副本,避免重复运行 + 模块路径解析错误
    exclude: ['.next/standalone/**', '**/node_modules/**', '**/dist/**'],
  },
  resolve: {
    alias: {
      '@': __dirname,
    },
  },
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html'],
    include: ['lib/**/*.ts'],
    exclude: ['**/*.test.ts', '**/node_modules/**'],
    thresholds: { lines: 50, functions: 50, branches: 40, statements: 50 },
  },
});
