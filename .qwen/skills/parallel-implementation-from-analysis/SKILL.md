---
name: parallel-implementation-from-analysis
description: 基于分析结果描述并行启动 Agent 实现功能，不参考原项目代码
source: auto-skill
extracted_at: '2026-05-31T03:20:50.998Z'
---

# 基于分析的并行功能实现

在分析外部项目获取功能描述后，启动多个实现 Agent 在非隔离环境下同时将功能移植到当前项目。

## 适用场景
- 分析完外部主题/项目后，将其功能移植到当前项目
- 多个独立功能模块需要同时实现
- 希望实现代码原创，不复制原项目代码

## 流程

### 第一步：全面了解当前项目结构
在派发实现 Agent 前，先用一个探索 Agent 了解当前项目的目录结构、组件布局、样式方案（Tailwind/CSS 变量等）、现有类似功能。

```json
{
  "subagent_type": "Explore",
  "description": "探索项目前端结构",
  "prompt": "Explore the /path/to/project structure. I need to understand:\n1. The home page files\n2. The layout/navbar components\n3. Footer component\n4. Search feature\n5. Social sharing\n6. Page banners/hero sections\n7. The CSS/styling approach\n8. The component/directory structure\n\nGive me a comprehensive overview..."
}
```

### 第二步：为每个功能模块撰写实现说明
基于分析阶段的描述，为每个功能编写详细的实现说明。关键是：
- **只基于分析描述**，不要参考原项目代码
- 明确指定目标文件路径
- 详细描述视觉风格（颜色、圆角、间距等）
- 详细描述交互行为
- 说明数据来源（props、config、API）
- 使用当前项目的技术栈（Tailwind、图标库、动画库等）
- 提供硬编码后备数据示例
- 明确要求"不要参考原项目代码"

### 第三步：并行启动实现 Agent
使用 `general-purpose` 类型，设置 `run_in_background: true`，不加 `isolation` 以允许在非隔离环境同时修改。

```json
{
  "subagent_type": "general-purpose",
  "run_in_background": true,
  "description": "实现[功能名称]",
  "prompt": "你需要在 /path/to/project 中实现[功能描述]。请基于以下描述实现，不要参考原项目代码。\n\n## 当前项目概况\n...\n\n## 需要实现的功能\n...\n\n## 技术要求\n..."
}
```

### 第四步：冲突检查与修复
所有 Agent 完成后：
1. 运行 TypeScript 类型检查：`npx tsc --noEmit`
2. 运行 ESLint 检查
3. 检查是否有同名文件冲突
4. 修复 ESLint 错误（hooks 条件调用、未处理 Promise、未使用变量等）
5. 提交并推送

## 关键规则

- **不参考原项目代码**：实现说明中只包含功能描述，不包含原项目的代码片段
- **非隔离改动**：不加 `isolation: "worktree"`，让 Agent 直接在主干上修改，但需要做好冲突预测
- **功能描述要详细**：视觉风格、布局结构、交互方式、数据流都要写清楚
- **Agent 粒度**：每个独立功能模块一个 Agent，粒度不宜过细（避免过多 Agent 冲突）
- **优先使用现有技术栈**：Tailwind CSS、lucide-react、motion（framer-motion 继任者）等
- **当前项目已有的全局文件不可修改**：globals.css、layout.tsx、postcss.config、package.json 等不应由实现 Agent 修改
