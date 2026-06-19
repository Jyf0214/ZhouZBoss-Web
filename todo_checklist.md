# Issue #75 修复清单

来源：issue_details.md — 修复 #74 两项 Critical 漏洞

## 漏洞清单

- [x] **C1** GitHub API 越权访问 — `app/api/github/route.ts` POST/GET 端点从 `requireAuth` 升级为 `requireAdmin`
- [x] **C2** CustomHead 存储型 XSS — `components/CustomHead.tsx` 对 `customCSS` 调用 `sanitizeCss()`、对 `customHead` 调用 `sanitizeHeadHtml()` 消毒

## 验证状态

- [x] TypeScript 类型检查通过
- [x] ESLint 检查通过
- [x] 全部测试通过
- [x] 生产构建成功
