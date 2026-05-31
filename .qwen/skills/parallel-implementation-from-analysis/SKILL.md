---
name: parallel-implementation-from-analysis
description: 基于分析报告并行启动多个 Agent 同步实现功能，无隔离同时修改不同文件
source: auto-skill
extracted_at: '2026-05-31T02:49:43.073Z'
---

# 并行实现流程（基于分析结果）

## 适用场景

已有外部项目的功能/UI 分析报告后，需要将多个功能模块并行移植到当前项目。每个 Agent 负责一个独立模块，同时修改同一仓库的不同文件。

## 关键区别：与并行分析的不同

| 维度 | 并行分析 | 并行实现 |
|------|---------|---------|
| Agent 类型 | `Explore`（只读） | `general-purpose`（读写） |
| 隔离方式 | 无需隔离 | **无隔离**（直接修改同一仓库） |
| 冲突风险 | 无 | 需确保各 Agent 操作不同文件 |
| 输出 | 分析报告 | 实际代码修改 |

## 步骤

### 第一步：了解当前项目结构

在启动实现 Agent 前，先派一个探索 Agent 了解当前项目的目录结构、已有组件、样式方案等：

```json
{
  "subagent_type": "Explore",
  "description": "探索项目前端结构",
  "prompt": "Explore the /path/to/project structure comprehensively..."
}
```

### 第二步：为每个模块编写实现说明

从分析报告中提取关键设计描述，转化为**可执行的实现说明**。每份说明应包含：

1. **当前项目概况** — 框架、样式方案、图标库、动画库、设计风格
2. **需要实现的功能** — 详细的视觉描述和行为描述
3. **具体目标文件** — 哪些文件需要创建/修改
4. **技术要求** — 组件类型（'use client'）、使用的库、样式约束

**关键原则**：
- ❌ **不要引用外部项目代码** — 只描述效果和行为
- ✅ 使用当前项目的技术栈（Tailwind、lucide-react、motion 等）
- ✅ 给每个拟创建的文件指定清晰路径
- ✅ 提供示例硬编码数据作为后备

### 第三步：并行启动实现 Agent

```json
{
  "subagent_type": "general-purpose",
  "run_in_background": true,
  "description": "实现 [模块名称]",
  "prompt": "你需要修改 /path/to/project 实现 [功能]。请基于以下描述实现，不要参考 /tmp/external-project 的代码。\n\n## 当前项目概况\n...\n\n## 需要实现的功能\n...\n\n## 技术要求\n..."
}
```

**要点**：
- 每个 Agent 使用 `run_in_background: true`
- 使用 `description` 区分不同任务
- **明确禁止参考外部项目代码**
- 确保各 Agent 操作的文件不重叠（检查创建/修改的文件路径）

### 第四步：等待所有 Agent 完成

所有 Agent 完成后，检查：
1. TypeScript 类型检查
2. ESLint
3. 构建

### 第五步：修复 ESLint 错误（常见问题）

并行实现 Agent 可能引入 ESLint 错误。常见类型及修复：

| 错误类型 | 修复方式 |
|---------|---------|
| `@typescript-eslint/no-unused-vars` | 删除未使用的导入/变量 |
| `react-hooks/rules-of-hooks` | 将 `useCallback`/`useEffect` 移到条件返回之前 |
| `@typescript-eslint/no-floating-promises` | 在异步调用前加 `void` |
| `complexity` | 警告级别，可暂不处理（≤500 警告阈值） |

### 第六步：提交与推送

- 使用 `git add -A && git commit` 一次性提交所有变更
- 包含清晰的提交说明

## 注意事项

- 各 Agent 操作的文件路径**必须不重叠**，否则后完成的 Agent 可能覆盖已完成 Agent 的修改
- Agent 可能自行执行 `git commit`，导致部分变更已提交、部分未提交
- 构建完成后运行 `git status` 检查是否所有变更都被提交
- 如果各 Agent 修改了同一文件的不同部分，后完成的 Agent 可能包含冲突的修改
