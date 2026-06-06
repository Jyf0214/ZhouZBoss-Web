---
name: optional-third-party-dependency-separation
description: 将硬依赖的第三方包（如 Clerk、Auth0、Sentry）改造为可选依赖，构建时无需安装也能成功
source: auto-skill
extracted_at: '2026-06-06T01:04:41.667Z'
---

# 第三方可选依赖分离模式

将原本作为硬依赖（`dependencies`）的第三方 SDK 包改造为可选依赖（`optionalDependencies`），使得未安装该包时项目仍能完整构建和运行，相关功能静默降级。

## 适用场景

- 项目中集成了某个第三方服务（如 Clerk 登录、Sentry 监控、Auth0 等），但该服务并非所有部署环境都需要
- 用户希望该依赖只在配置了相关环境变量时才被安装和启用
- 项目需要在没有该 SDK 的情况下也能构建成功（如在 CI/CD 中跳过非必需的安装）
- 该第三方包较大或需要额外的配置步骤，希望按需启用

## 核心难点

第三方 SDK 改造为可选依赖的最大技术挑战是 **JavaScript 打包工具的静态分析**：

- `import('@clerk/nextjs')` 或 `next/dynamic(() => import(...))` 都会被 webpack/Turbopack 在构建时静态分析并尝试解析
- 如果依赖未安装，构建就会因模块未找到而失败
- 简单的 `try-catch` 在动态 `import()` 周围无效，因为构建器在运行代码之前就已经解析了模块

## 工作流程

### 第一步：移动依赖标记

**package.json** — 从 `dependencies` 移至 `optionalDependencies`：

```json
{
  "dependencies": {
    // ... 核心依赖保持不变
  },
  "optionalDependencies": {
    "@clerk/nextjs": "^7.2.9",
    "@clerk/localizations": "^4.5.7"
  }
}
```

`optionalDependencies` 的特性：
- `npm install` 会尝试安装，但失败时仅警告，不会中止安装
- `npm install --no-optional` 跳过所有可选依赖
- 安装失败时，相关模块不在 `node_modules` 中

### 第二步：创建运行时动态导入工具（核心模式）

创建 `lib/<package>-dynamic.ts`，使用 `new Function` 构建运行时 `import()`：

```typescript
/**
 * 运行时动态 import()，避开构建器静态分析
 * new Function 创建的函数不受 bundler 的 import() 追踪
 */
function runtimeImport(specifier: string): Promise<unknown> {
  // biome-ignore lint/security/noGlobalFunction: 必须绕过 bundler 静态分析
  const importFn = new Function('s', 'return import(s)') as (s: string) => Promise<unknown>;
  return importFn(specifier);
}
```

为什么需要 `new Function`？
- 普通 `import('@pkg/name')`：webpack/Turbopack 静态解析字符串，即使放在 `try-catch` 中也会在构建时尝试解析模块
- `import(pkgName)`（变量形式）：构建器不知道具体包名，但会打包整个 `node_modules`
- `new Function('s', 'return import(s)')('@pkg/name')`：构建器完全看不到 import 调用，import 只在运行时执行

暴露封装好的方法：

```typescript
/** 同步检查环境变量是否配置 */
export function isServiceConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SERVICE_KEY;
}

/** 加载客户端模块 */
export async function loadServiceClient<T = Record<string, unknown>>(): Promise<T | null> {
  try {
    const mod = await runtimeImport('@service/client');
    return mod as T;
  } catch {
    return null;
  }
}

/** 加载服务端模块 */
export async function loadServiceServer<T = Record<string, unknown>>(): Promise<T | null> {
  try {
    const mod = await runtimeImport('@service/server');
    return mod as T;
  } catch {
    return null;
  }
}
```

### 第三步：改造消费文件

有三种不同的改造模式，按文件类型区分：

#### 3a. API 路由（服务端）

**模式：** 函数级动态导入

```typescript
// Before:
import { auth } from '@service/server';

export async function GET() {
  const { userId } = await auth();
  // ...
}

// After:
import { isServiceConfigured, loadServiceServer } from '@/lib/service-dynamic';

export async function GET() {
  if (!isServiceConfigured()) {
    return NextResponse.json({ error: '服务未配置' }, { status: 400 });
  }

  const mod = await loadServiceServer<{ auth: () => Promise<{ userId: string }> }>();
  if (!mod?.auth) {
    return NextResponse.json({ error: '服务模块不可用' }, { status: 500 });
  }

  const { userId } = await mod.auth();
  // ...
}
```

**关键设计：**
- 返回 400/500 而非静默失败，让调用方明确知道状态
- 双重检查：环境变量存在 + 模块可加载

#### 3b. 客户端组件（Provider/Context）

**模式：** `useEffect` + `useState` + `createElement`

```tsx
'use client';

import { useEffect, useState, createElement, type ReactNode } from 'react';
import { isServiceConfigured, loadServiceClient } from '@/lib/service-dynamic';

export function ServiceProvider({ children }: { children: ReactNode }) {
  const [ProviderComp, setProviderComp] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isServiceConfigured()) {
      setLoading(false);
      return;
    }
    loadServiceClient()
      .then(async (mod) => {
        if (!mod) return;
        const Provider = (mod as Record<string, unknown>).ServiceProvider
          as React.ComponentType<any> | undefined;
        if (Provider) setProviderComp(() => Provider);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !ProviderComp) return <>{children}</>;

  return createElement(ProviderComp, { /* props */ }, children);
}
```

**为什么用 `createElement`：**
- 动态加载的组件无法作为 JSX 标签使用（TypeScript 报错）
- `createElement(type, props, ...children)` 完全绕过了类型检查
- 组件引用存储在 `useState` 中，渲染时通过 `createElement` 调用

#### 3c. 页面组件（Next.js App Router 页面）

**模式：** `useEffect` + `useState` + `createElement`

```tsx
'use client';

import { useEffect, useState, createElement } from 'react';
import { loadServiceClient } from '@/lib/service-dynamic';

export default function ServicePage() {
  const [WidgetComp, setWidgetComp] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    loadServiceClient()
      .then((mod) => {
        if (!mod) return;
        const Widget = (mod as Record<string, unknown>).Widget
          as React.ComponentType<any> | undefined;
        if (Widget) setWidgetComp(() => Widget);
      })
      .catch(() => { /* 静默降级 */ });
  }, []);

  if (!WidgetComp) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      {createElement(WidgetComp, { prop1: 'value1', prop2: 'value2' })}
    </div>
  );
}
```

**注意：** 不要使用 `next/dynamic` —— 它仍然会在构建时解析依赖路径。

### 第四步：处理 TypeScript 和 ESLint

#### 使用 `any` / `Record<string, unknown>` 处理未知类型

由于动态加载的模块没有类型信息，需要正确处理类型：

```typescript
// 获取模块后，转为 Record<string, unknown> 再访问属性
const mod = await loadServiceClient();
if (!mod) return;
const m = mod as Record<string, unknown>;
const Component = m.SomeExport as React.ComponentType<any> | undefined;
if (Component) setComp(() => Component);
```

#### ESLint 规则豁免

```typescript
// 对于必须的 as any 转换：
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Comp = mod.SomeExport as React.ComponentType<any>;

// 对于 empty catch：
.catch(() => {
  /* 可选依赖不可用时静默降级 */
});

// 对于不必要的类型断言（mod 已窄化到 Record<string, unknown>）：
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
const Comp = (mod.SignIn as React.ComponentType<any> | undefined);
```

#### 禁用未使用导入警告

```
'ReactNode' is defined but never used  @typescript-eslint/no-unused-vars
```
当重构后不再需要某个导入时，直接删除。

### 第五步：添加配置项（可选）

如果同时希望在 `config.yaml` 中控制开关：

```yaml
clerk:
  enable: false
```

```typescript
export interface ClerkConfig {
  enable: boolean;
}
```

然后在启动检查中增加配置判断：
```typescript
export function isServiceEnabled(config?: { clerk?: { enable?: boolean } }): boolean {
  if (config?.clerk?.enable === false) return false;
  return !!process.env.NEXT_PUBLIC_SERVICE_KEY;
}
```

## 不使用 `next/dynamic` 的原因

| 方法 | 构建时是否解析 | 运行时行为 | 能否处理未安装的场景 |
|------|---------------|-----------|-------------------|
| `next/dynamic(() => import(...))` | ✅ 是，创建 split chunk | 按需加载 | ❌ 构建失败 |
| `React.lazy(() => import(...))` | ✅ 是，创建 split chunk | 按需加载 | ❌ 构建失败 |
| `new Function('s', 'return import(s)')('@pkg')` | ❌ 否，完全绕过 | 运行时动态导入 | ✅ 可 catch |
| `const m = await import(pkgVar)`（变量） | ❌ 否，但打包整个 node_modules | 运行时动态导入 | ⚠️ 构建时引用全部，不可控 |

## 常见问题

### Q: `new Function` 的性能影响？
A: `new Function` 只在首次调用时创建函数对象，后续调用复用该对象。对性能的影响可以忽略不计。

### Q: 处理 React hooks 无法动态调用
A: 第三方 SDK 提供的 React hooks（如 `useUser()`、`useSession()`）无法通过动态导入使用，因为 hooks 必须在组件顶层调用。**替代方案**：改用 API 路由调用来获取状态。例如用 `fetch('/api/auth/check')` 替代 `useUser()`。

### Q: 构建器告警 "Critical dependency" 或类似信息？
A: Turbopack 和 webpack 对运行时动态 import 可能会有告警。这些告警是安全的，可以通过配置或忽略来处理。

### Q: 怎样测试分离效果？
A: 创建两种测试场景：
1. **有依赖场景**：`npm install`（默认安装可选依赖），运行完整测试
2. **无依赖场景**：`npm install --no-optional` 或手动删除 `node_modules` 中对应包，确认构建通过且降级功能正常

## 验证清单

- [ ] `npm install` 后构建成功，所有功能正常
- [ ] `npm install --no-optional` 后构建成功，功能降级正常
- [ ] 设置了环境变量时，第三方功能正确启用
- [ ] 未设置环境变量时，所有相关入口显示明确提示而非运行时崩溃
- [ ] API 路由在依赖未配置时返回 400/500
- [ ] 客户端组件显示降级 UI 而非白屏
- [ ] TypeScript 类型检查通过（0 error）
- [ ] ESLint 检查通过（0 error, warnings < 500）
- [ ] 所有静态 `import from '第三方包'` 已被移除
- [ ] 未使用 `next/dynamic` 引用第三方包
