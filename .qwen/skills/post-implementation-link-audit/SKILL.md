---
name: post-implementation-link-audit
description: 大规模功能变更后扫描全仓库内部链接，发现并修复指向不存在页面的断链
source: auto-skill
extracted_at: '2026-05-31T02:49:43.073Z'
---

# 变更后内部链接审计流程

## 适用场景

在完成多模块并行实现、大规模重构或新增页面后，检查仓库中所有内部链接是否指向存在的页面路由。

## 流程

### 第一步：确认已有路由清单

从构建输出或文件系统获取所有现有页面路由。Next.js App Router 中，每个含 `page.tsx` 的目录对应一个路由。

```bash
# 从构建输出获取路由清单
cd /path/to/project && npm run build 2>&1 | grep "^├" | grep -v api

# 或直接扫描目录
find app -name "page.tsx" | sort
```

动态路由注意点：
- `[param]` 匹配 `/xxx/anything`
- `[...slug]` 匹配 `/xxx/a/b/c`
- 只有 `page.tsx` 才算路由（不是 `layout.tsx` 或 `loading.tsx`）

### 第二步：扫描内部链接

派一个只读 Agent 扫描全部源码中的内部 href：

```json
{
  "subagent_type": "Explore",
  "description": "扫描全部内部链接有效性",
  "prompt": "Scan the entire /path/to/project codebase for all internal links (href=\"/xxx\", router.push(\"/xxx\")) and identify which ones point to pages that do NOT exist.\n\n1. Build the list of ALL existing routes/pages from app/ directory structure\n2. Search for ALL internal href patterns:\n   - `href=\"/...\"` in TSX/TS files\n   - `router.push(\"/...\")`\n   - `Link href=\"/...\"`\n   - Navigation links in config files\n3. Report every internal link that points to a non-existent route\n\nExclude:\n- External URLs (http://, https://, mailto:, tel:)\n- Anchor links (#)\n- API routes (/api/)\n- Next.js system routes (_next)\n- Already-known valid routes\n\nSearch in: components/, app/, lib/, hooks/, config files"
}
```

### 第三步：分析断链

常见的断链来源：

| 来源 | 原因 |
|------|------|
| 新模块的硬编码默认数据 | 如 `DEFAULT_LINKS`、示例数据中的链接 |
| 条件渲染的链接 | 如注册按钮指向不存在的 `/register` |
| 动态路由参数错误 | 如 `/editor/${slug}` 但编辑器使用 `?id=` |
| 参考设计稿时硬编码的路径 | 如 `/privacy`、`/terms`、`/updates` |

### 第四步：修复断链

```json
{
  "subagent_type": "general-purpose",
  "prompt": "修复扫描发现的失效链接..."
}
```

**修复策略**：

| 原链接 | 推荐修复 | 理由 |
|--------|---------|------|
| `/register` | → `/login` | 登录页存在，通常含注册入口 |
| `/privacy` `/terms` | → `/about` | 关于页可包含相关信息 |
| `/updates` | → `/posts` | 文章列表可展示最新内容 |
| `/editor/{slug}` | → `/editor?id={slug}` | 编辑器使用查询参数 |
| 缺失页面 | → 创建简单占位页面 | 如 `app/privacy/page.tsx` |

### 第五步：验证

```bash
# 确认无残留
grep -r "href=\"/privacy" app/ components/
grep -r "href=\"/register" app/ components/
grep -r "href=\"/terms" app/ components/
grep -r "href=\"/updates" app/ components/

# 重新构建确认
npm run build
```

## 关键检查清单

- [ ] 所有 `href="/xxx"` 在 route list 中有对应项
- [ ] 所有 `router.push("/xxx")` 在 route list 中有对应项
- [ ] 动态路由参数格式正确（`/editor?id=x` 而非 `/editor/x`）
- [ ] 默认数据中的示例链接指向有效页面
- [ ] 配置文件中引用的链接路径正确
