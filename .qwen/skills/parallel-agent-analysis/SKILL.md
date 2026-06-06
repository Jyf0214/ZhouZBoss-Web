---
name: parallel-agent-analysis
description: 并行启动多个 Agent 分析不同代码模块，汇总报告后启动修复 Agent
source: auto-skill
extracted_at: '2026-05-31T02:31:02.665Z'
---

# 并行 Agent 分析流程

支持两种分析场景：**内部审计/重构**（分析当前仓库）和**外部探索**（分析外部项目获取设计灵感）。核心方法相同：分解模块 → 并行 Agent → 汇总。

## 场景一：内部审计/重构

### 第一步：分拆分析范围
将代码库按模块分拆，每个 Agent 负责一个独立模块：

| Agent | 范围 | 目标 |
|---|---|---|
| Agent 1 | `components/` + `app/` pages | UI 组件重复模式 |
| Agent 2 | `app/api/` | API 路由模板代码 |
| Agent 3 | `lib/` + `hooks/` + `types/` | 工具函数/类型冗余 |

### 第二步：并行启动 Explore Agent

```json
{
  "subagent_type": "general-purpose",
  "run_in_background": true,
  "description": "分析 [模块名]",
  "prompt": "你是一名...[角色描述]。不修改文件，只输出分析报告..."
}
```

- 每个 Agent 用 `description` 区分任务
- 使用 `run_in_background: true`
- 告知 Agent **不要修改任何文件**
- 对修改型任务使用 `isolation: "worktree"`

### 第三步：汇总报告
每个 Agent 完成后输出结构化报告，包含：
- 每个模式的文件路径和行号
- 建议的修复方式
- 预估减少代码量

### 第四步：启动修复 Agent（禁止隔离）
根据报告，启动一个或多个修复 Agent，**直接修改主项目文件，不使用任何隔离**。

```json
{
  "subagent_type": "general-purpose",
  "run_in_background": true,
  "description": "[具体修复任务]",
  "prompt": "修复方案..."
}
```

重要规则：
- **始终直接修改主项目文件**，不使用 `isolation: "worktree"` 或其他隔离方式
- 如果项目中有遗留的工作树文件（`.qwen/worktrees/`），先清理：`rm -rf .qwen/worktrees/`
- 修复 Agent 要给出具体的代码替换方案，按组分批验证

### 第五步：合并 worktree（已废弃，不再使用）

## 场景二：外部项目探索分析

当需要分析外部项目（如主题、框架）的功能和 UI 实现时，不需要修复步骤，重点在功能模块拆分和并行探索。

### 第一步：定位外部项目

```bash
# 搜索外部项目位置
find /tmp -maxdepth 3 -type d -name "*project-name*" 2>/dev/null
find /home/user -maxdepth 4 -type d -name "*project-name*" 2>/dev/null
```

### 第二步：先派一个探索 Agent 获取项目全貌

派一个 Agent 遍历目录结构，整理出完整的功能/模块清单：

```json
{
  "subagent_type": "Explore",
  "description": "探索 [项目名] 结构",
  "prompt": "Explore /path/to/project thoroughly. I need a comprehensive list of all major features, UI components, and functional modules this theme offers.\n\nLook at:\n1. Layout directory structure\n2. Script/JS directories\n3. Stylesheet structure\n4. Partial/includes directories\n5. Configuration files\n6. Any widget/module directories\n\nList every distinct feature/module/component you find. For each one, give a short description of what it does. Group related features.\n\nDo NOT include any actual code in your output - only descriptions and feature names."
}
```

### 第三步：按功能模块派发并行分析 Agent

每个 Agent 负责一个独立功能区域，分析其 **UI 实现效果** 和 **功能行为**：

```json
{
  "subagent_type": "Explore",
  "description": "分析 [模块名称] UI",
  "prompt": "分析 /path/to/project [具体模块] 的 UI 实现效果和功能。\n\n具体分析子模块：\n1. [子功能1] — 要分析的方面\n2. [子功能2] — 要分析的方面\n\n请详细描述每个部分的：\n- 视觉风格和布局\n- 用户交互方式\n- 配置灵活性\n- 整体用户体验效果\n\n不要返回任何具体代码，只做分析和描述。"
}
```

- 每个 Agent 使用 `subagent_type: "Explore"`（只读，无写权限）
- 使用 `description` 区分各 Agent 的分析范围
- **明确要求不返回代码**，仅输出分析和描述
- 模块粒度参考：页面布局、导航、文章功能、搜索、评论、侧边栏、特效、页脚、第三方集成等
- 单次可以并行启动 8-12 个 Agent（独立模块足够多时）

### 第四步：汇总分析报告

所有 Agent 完成后，汇总为一个模块清单，每个模块包含：
- 功能名称和定位
- UI 视觉风格描述
- 交互方式和用户体验评价
- 配置灵活性说明

### 第五步：按需进一步深入

如果分析结果需要进一步深入某个模块，可以再派专项 Agent 深入，或根据分析结果启动修复/实现 Agent 将功能移植到当前项目。

## 通用规则

- 分析 Agent **只读不写**（内部审计用 `general-purpose` + 告知不修改；外部探索用 `Explore` 类型天然只读）
- 每个 Agent 限定在单一模块，避免职责重叠
- 并行启动数量控制在合理范围（8-12 个为宜），避免过载
- 外部探索场景**始终要求不返回代码**，只做分析和描述
- 分析完成后可按需进一步深入特定模块或启动功能移植
