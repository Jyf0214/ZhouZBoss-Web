---
name: configurable-global-visual-setting
description: 通过 config.yaml + CSS 变量 + 运行时 Provider 让全局外观属性可配置
source: auto-skill
extracted_at: '2026-05-31T03:44:13.187Z'
---

# 可配置的全局外观属性模式

当需要让某个全局视觉属性（如基础字号、行高、间距、圆角等）同时支持 `config.yaml` 配置和网页端管理面板动态调整时，使用以下四层架构。

## 适用场景

- 用户抱怨某个全局样式（如"字体太大"），但排查后无法找到明确代码原因
- 用户希望不修改代码就能通过配置文件或管理后台调整某个视觉属性
- 需要将某个硬编码的全局样式参数化，使其可被运维/管理员调优

## 工作流程

### 第一步：配置层（config.yaml + 类型定义）

**config.yaml** — 添加字段，设置合理的默认值：
```yaml
appearance:
  fontSize: 15        # 全局基础字号（px），默认 15 而非浏览器标准的 16
```

**next.config.ts** — 添加对应的 TypeScript 类型：
```ts
export interface AppearanceConfig {
  /** 全局基础字号（px），默认 16，可在网页端配置 */
  fontSize?: number;
  // ... 已有字段
}
```

> `config.yaml` 的默认值应比浏览器默认值稍小（如 15px），因为用户抱怨的基础就是"太大"。

### 第二步：CSS 层（globals.css 使用 CSS 变量）

```css
@import "tailwindcss";

html {
  /* CSS 变量 + 回退值：变量由运行时 Provider 动态设置 */
  font-size: var(--base-font-size, 15px);
}
```

**关键点：**
- CSS 变量名使用 `--base-*` 命名空间，避免与 Tailwind 的 `--*` 冲突
- 回退值（`15px`）与 `config.yaml` 的默认值保持一致，这样在没有 JavaScript 执行时（如 SSG 页面）也能正确渲染
- 只在 `html` 或 `body` 上设置，利用 CSS 继承性影响所有元素

### 第三步：运行时层（客户端 Provider 组件）

创建 `components/FontSizeProvider.tsx`：

```tsx
'use client';

import { useEffect } from 'react';

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const apply = async () => {
      try {
        const res = await fetch('/api/config');
        if (!res.ok) return;
        const data = await res.json();
        const size = data?.appearance?.fontSize;
        // 严格校验：避免非法值导致布局崩溃
        if (typeof size === 'number' && size >= 10 && size <= 30) {
          document.documentElement.style.setProperty('--base-font-size', `${size}px`);
        }
      } catch {
        // 静默失败，使用 CSS 默认值
      }
    };
    void apply();
  }, []);

  return <>{children}</>;
}
```

**设计要点：**
- **useEffect 只执行一次**（空依赖数组），适合不频繁变化的全局配置
- **严格范围校验**（10-30px）：防止配置错误导致页面完全不可用
- **静默兜底**：fetch 失败时自动使用 CSS 变量的 fallback 值，不阻塞渲染
- **在 `document.documentElement`（即 `<html>`）上设置**：与 `globals.css` 中的选择器一致

在 `providers.tsx` 中注册，使其全局生效：
```tsx
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider>
      <BackgroundProvider>
        <FontSizeProvider>
          {children}
        </FontSizeProvider>
      </BackgroundProvider>
    </ConfigProvider>
  );
}
```

### 第四步：管理后台层（Admin UI 配置）

需要在三处修改：

**1. config-builders.ts** — 给 `ConfigState.appearance` 添加字段，并在 builder 函数中读取：
```ts
appearance: {
  fontSize?: number;  // 类型定义
  // ...
}

// builder 函数中：
fontSize: (appearanceData?.fontSize as number) ?? 15,
```

**2. config/page.tsx** — 在初始化 state 中添加默认值：
```ts
appearance: {
  fontSize: 15,
  // ...
}
```

**3. config-form-body.tsx** — 添加 UI 输入组件 + change handler：
```tsx
const handleFontSizeChange = (v: string) => {
  const num = parseInt(v, 10);
  if (!isNaN(num) && num >= 10 && num <= 30) {
    onConfigChange({
      ...config,
      appearance: { ...config.appearance, fontSize: num },
    });
  }
};

// 在 ConfigSection 中渲染：
<FormField
  label="全局基础字号（px）"
  value={String(config.appearance.fontSize ?? 15)}
  onChange={handleFontSizeChange}
  type="text"
  placeholder="15"
/>
<p className="text-xs text-zinc-400 mt-1">
  设置 10-30 之间的值，默认 15。保存后刷新页面生效。
</p>
```

**适配器（Adapter）注意事项：**
管理后台的 `buildAppearanceConfig` 接收的是 `/api/config` 返回的扁平 JSON，与 `config.yaml` 的结构不完全一致。需要在 builder 函数中做一层适配转换。

### 验证方法

1. 本地 `npm run build` 确认无构建错误
2. 访问线上页面，检查 `html` 元素的 `style` 属性是否设置了 `--base-font-size`
3. 修改 `config.yaml` 中的值，重新部署后确认生效
4. 通过管理后台修改值，保存后刷新页面确认生效
5. 极端值测试：设为 10px 和 30px，确认不会破坏布局
6. 缺失值测试：删除 `config.yaml` 中的字段，确认使用 hardcoded fallback

## 适用扩展

此模式可用于任何全局视觉属性：

| 属性 | CSS 变量 | 配置字段 | 默认值 |
|------|----------|---------|--------|
| 基础字号 | `--base-font-size` | `fontSize` | 15px |
| 行高 | `--base-line-height` | `lineHeight` | 1.5 |
| 内容最大宽度 | `--content-max-width` | `contentMaxWidth` | 48rem |
| 圆角 | `--base-border-radius` | `borderRadius` | 0.75rem |
| 间距 | `--base-gap` | `gap` | 1rem |

## 与 visual-regression-debug 的关系

- `visual-regression-debug` 用于**诊断**视觉回归问题的根因
- `configurable-global-visual-setting` 用于在诊断无果或需要灵活调优时，**提供一个可配置的出口**
- 当用户报告视觉问题但排查不到代码级根因时，建议流程是：先按 `visual-regression-debug` 排查 → 若确实找不到根因 → 按本技能将相关属性参数化

## 反模式

- ❌ 直接在 `globals.css` 写死字号，不提供可配置路径
- ❌ 用 JS 动态注入 `<style>` 标签来修改字号（增加复杂度，不利于维护）
- ❌ 在 Provider 中不设范围校验（配置错误可能导致整站不可用）
- ❌ 使用 inline style 覆盖而不是 CSS 变量（失去 CSS 继承和响应式能力）
