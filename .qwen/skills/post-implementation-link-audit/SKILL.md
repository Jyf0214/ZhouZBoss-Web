---
name: post-implementation-link-audit
description: 大规模改动后，全面扫描所有内部链接确保指向已存在的路由
source: auto-skill
extracted_at: '2026-05-31T03:20:50.998Z'
---

# 变更后内部链接审计

在大规模功能实现或重构后，扫描代码库中所有内部 href 链接，验证它们指向的页面/路由是否真实存在。

## 适用场景
- 多个并行 Agent 完成实现后
- 新增大量页面/组件后
- 重构路由结构后
- 复制或参考外部项目的导航结构后

## 审计流程

### 第一步：建立现有路由清单
列出 Next.js App Router 下所有有效路由。遍历 `app/` 目录下所有包含 `page.tsx`（或 `page.mdx`）的子目录。

有效路由规则：
- `app/page.tsx` → `/`
- `app/diary/page.tsx` → `/diary`
- `app/diary/[id]/edit/page.tsx` → `/diary/[id]/edit`
- `app/posts/[...slug]/page.tsx` → `/posts/[...slug]`（动态路由）
- `app/clerk/sign-in/[[...rest]]/page.tsx` → `/clerk/sign-in/...`（可选参数路由）
- `app/(group)/page.tsx` → `/`（路由组不改变路径）

### 第二步：扫描所有内部链接
搜索以下模式（排除外部 URL 和锚点）：
- `href="/..."` 在 TSX/TS 文件中
- `href={"/..."}` 动态链接
- `router.push("/...")` 编程式导航
- Link 组件的 `href` prop
- 硬编码的路径字符串

使用 grep 或 Explore Agent 扫描。

### 第三步：逐一比对
对每个找到的内部链接，检查其在路由清单中是否存在：
- 静态路由：精确匹配
- 动态路由：匹配模式（如 `/diary/xxx/edit` 匹配 `/diary/[id]/edit`）
- 注意：区分大小写

### 第四步：修复方案
对每个失效链接：

| 链接 | 修复方案 |
|------|---------|
| 有对应页面但路径错误 | 修正路径 |
| 无对应页面但有替代页面 | 指向替代页 |
| 无对应页面且无替代 | 创建页面或移除链接 |
| 动态路径格式错误（如 `/editor/{slug}` 应为 `/editor?id={slug}`） | 修复为正确格式 |

### 第五步：提交修复

```bash
git add -A
git commit -m "fix: 修复 X 处指向不存在页面的内部链接"
git push
```

## 常见问题

- 配置中的默认链接（如页脚 DEFAULT_LINKS 硬编码数组）容易被忽略
- `register` 页面不存在时，可以指向 `/login`（登录页通常有注册入口）
- `privacy`/`terms` 等法律页面不存在时，可以指向 `/about`
- `updates`/`changelog` 页面不存在时，可以指向 `/posts`
- 编辑器动态路径：`/editor/{slug}` → `/editor?id={slug}`（如果编辑器使用 searchParams）
- Next.js App Router 中静态路由和动态路由不互通：有 `app/editor/page.tsx` 不代表 `/editor/xxx` 可用，需要 `app/editor/[slug]/page.tsx`
