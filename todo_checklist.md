# 🔒 漏洞档案清单 — 2026-06-28 周度安全审计

> 由 3 个并行 Explore 子智能体 + Orchestrator 人工分析联合扫描生成
> 审计范围：71 个 API 路由、45 个 lib 文件、126 个组件、npm 依赖
> 全部漏洞已修复并通过测试验证 ✅

---

## 🔴 高危 (High) — 全部已修复 ✅

- [x] **J28-H1: 页面密码通过 URL 查询参数传递** ✅
  - 文件：`app/page/_components/PasswordPrompt.tsx`
  - 问题：密码以 `?pwd=xxx` 形式出现在 URL 中，泄露到浏览器历史、日志、Referer 头
  - 修复：改用 POST + httpOnly cookie 机制，新增 `/api/page-password` API

- [x] **J28-H2: nodemailer 高危依赖漏洞 (8.0.11)** ✅
  - 问题：nodemailer <=9.0.0 存在 CRLF 注入、任意文件读取、SSRF 等高危漏洞
  - 修复：升级 nodemailer 到安全版本

---

## 🟡 中危 (Medium) — 全部已修复 ✅

- [x] **J28-M1: CopyrightNotice innerHTML 解码 HTML 实体** ✅
  - 文件：`components/ui/CopyrightNotice.tsx`
  - 问题：`decodeHtml` 使用 innerHTML 解析，可能触发脚本执行
  - 修复：改用 DOMParser 安全解析

- [x] **J28-M2: 日记版本历史存储明文内容** ✅
  - 文件：`app/api/diary/route.ts`
  - 问题：`saveDiaryVersion` 接收加密前的明文存储到数据库
  - 修复：调用方传入加密后的内容

- [x] **J28-M3: npm 依赖漏洞（vitest/vite/@babel/core）** ✅
  - 问题：vitest/vite 存在 critical/high 漏洞
  - 修复：npm audit fix 升级到安全版本

---

## 📊 统计

| 严重程度 | 发现数 | 已修复 | 测试通过 |
|---------|--------|--------|---------|
| 高危 (High) | 2 | 2 ✅ | ✅ |
| 中危 (Medium) | 3 | 3 ✅ | ✅ |
| **合计** | **5** | **5** | **191 pass** |

## 🧪 测试验证

- 基线：191 passed, 2 skipped (15 test files)
- 修复后：191 passed, 2 skipped (15 test files)
- 回归：零

## 🔍 npm 依赖审计

- 修复前：12 vulnerabilities (2 critical, 2 high, 7 moderate, 1 low)
- npm audit fix 后：8 vulnerabilities (0 critical, 0 high, 7 moderate, 1 low)
- nodemailer 升级后：7 vulnerabilities (全部 moderate/low，无 high/critical)
