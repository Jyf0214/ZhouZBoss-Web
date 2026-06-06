---
name: post-detail-feature-integration
description: 为帖子详情页批量添加 TOC、版权声明、分享按钮、原创/转载标识等功能的集成模式
source: auto-skill
extracted_at: '2026-06-06T09:18:06.934Z'
---

# 帖子详情页功能集成

为帖子详情页批量添加博客标准功能（目录、版权、分享、原创标识）的模式。

## 适用场景

- 帖子/文章详情页需要补充博客常见功能模块
- 配置文件中已有相关配置项但未被页面使用
- 目标功能彼此独立可以并行开发

## 标准功能集

| 功能 | 实现方式 | 配置来源 |
|------|---------|---------|
| 原创/转载标识 | 文章头部 `<Tag variant="emerald|amber">` | `file.meta.type` |
| 目录 TOC | 桌面侧边栏 + 移动端浮动面板 | `config.toc` |
| 分享按钮 | 链接复制 + 社交平台弹出窗口 | `config.share.sharejs` |
| 版权声明 | 底部卡片（作者+许可协议+转载标识） | `config.copyright` |

## 组件依赖

需要在 `components/ui/` 中创建：
- `TOC.tsx` — 从 markdown 提取标题生成目录树，支持 IntersectionObserver 高亮
- `CopyrightNotice.tsx` — 版权信息卡片
- `ShareButtons.tsx` — 分享按钮组

同时需要：
- 修改 `MarkdownRenderer.tsx` 为标题添加 `id` 属性（slugify）以支持 TOC 锚点跳转

## 集成步骤

### 1. 创建 UI 组件（可并行）

启动多个 Agent 分别创建独立组件，无内部依赖：

```json
{
  "Agent A": "components/ui/TOC.tsx + MarkdownRenderer 标题 ID",
  "Agent B": "components/ui/CopyrightNotice.tsx",
  "Agent C": "components/ui/ShareButtons.tsx"
}
```

### 2. 集成到页面（单 Agent）

所有组件创建完成后，启动一个 Agent 集成到 `page.tsx`：

| 变更 | 说明 |
|------|------|
| import 添加 | `TOC`, `CopyrightNotice`, `ShareButtons` |
| **布局修改** | 从单列 `max-w-3xl` 改为 `max-w-6xl` + `lg:flex lg:gap-12` 双栏布局 |
| 原创/转载标识 | 在 `<header>` 标签之前添加，基于 `file.meta.type` 判断 |
| TOC 侧边栏 | 右侧 `sticky top-24`，仅在 `config.toc.post && headingCount >= 3` 时显示 |
| 版权声明 | 在字数统计之后，CopyrightNotice 组件 |
| 分享按钮 | 在版权声明之后，ShareButtons 组件 |
| i18n 补充 | 添加 `toc.title`、`post.copyright.original/reprint`、`post.share.*` |

### 3. 验证

- `npx tsc --noEmit` — 零错误
- `npx eslint . --max-warnings=500` — 检查 hooks 规则、未使用变量
- 检查配置文件的对应字段存在（toc、copyright、share）

## 关键注意事项

- **MarkdownRenderer 是客户端组件**，TOC 也需要是客户端组件以使用 IntersectionObserver
- **TOC 和页面共享 slugify 函数**，确保 MarkdownRenderer 中的标题 ID 生成与 TOC 中的锚点一致
- **ShareButtons 的微信分享**无法直接实现二维码，使用弹出提示"复制链接到微信分享"替代
- **原创/转载标识**在文章头部和版权声明底部各出现一次，头部是徽章，底部是版权协议说明
