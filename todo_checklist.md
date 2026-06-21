# 🔒 漏洞档案清单 — 2026-06-21 周度安全审计

> 由 3 个并行 Explore 子智能体 + Orchestrator 人工分析联合扫描生成
> 审计范围：71 个 API 路由、45 个 lib 文件、126 个组件、16 个 hooks、npm 依赖
> 全部漏洞已修复并通过测试验证 ✅

---

## 🔴 高危 (High) — 全部已修复 ✅

- [x] **J21-H1: 页面密码通过 URL 查询参数传递** ✅
  - 文件：`app/page/_components/PasswordPrompt.tsx`
  - 问题：密码以 `?pwd=xxx` 形式出现在 URL 中，泄露到浏览器历史、日志、Referer 头
  - 修复：改用 POST + httpOnly cookie 机制传递密码

- [x] **J21-H2: nodemailer 高危依赖漏洞** ✅
  - 问题：nodemailer <=9.0.0 存在 CRLF 注入、文件读取、SSRF 等高危漏洞
  - 修复：升级 nodemailer 到安全版本

---

## 🟡 中危 (Medium) — 全部已修复 ✅

- [x] **J21-M1: HeadInjector useEffect 无清理导致 DOM 元素累积** ✅
  - 文件：`components/HeadInjector.tsx`
  - 问题：组件卸载/重新挂载时，之前注入的 DOM 元素不会被移除
  - 修复：添加 useEffect cleanup 函数

- [x] **J21-M2: CopyrightNotice innerHTML 解码 HTML 实体** ✅
  - 文件：`components/ui/CopyrightNotice.tsx`
  - 问题：`decodeHtml` 使用 innerHTML 解析，可能触发脚本执行
  - 修复：改用 DOMParser 安全解析

- [x] **J21-M3: 日记版本历史存储明文内容** ✅
  - 文件：`lib/diary-version.ts`、`app/api/diary/route.ts`
  - 问题：`saveDiaryVersion` 接收加密前的明文存储到数据库
  - 修复：调用方传入加密后的内容

- [x] **J21-M4: diary-version.ts 和 audit.ts 使用 `as any` 绕过类型安全** ✅
  - 文件：`lib/diary-version.ts`、`lib/audit.ts`
  - 问题：`prisma as any` 绕过 TypeScript 类型检查
  - 修复：改用 Prisma 扩展模型或正确的类型断言

---

## 📊 统计

| 严重程度 | 发现数 | 已修复 | 测试通过 |
|---------|--------|--------|---------|
| 高危 (High) | 2 | 2 ✅ | ✅ |
| 中危 (Medium) | 4 | 4 ✅ | ✅ |
| **合计** | **6** | **6** | **191 pass** |

## 🧪 测试验证

- 基线：191 passed, 2 skipped (15 test files)
- 修复后：191 passed, 2 skipped (15 test files)
- 回归：零

## 🔍 npm 依赖审计

- 修复前：10 vulnerabilities (2 critical, 2 high, 5 moderate, 1 low)
- npm audit fix 后：7 vulnerabilities (1 high, 5 moderate, 1 low)
- nodemailer 升级后：减少到 5 vulnerabilities (全部 moderate/low，无 high/critical)
