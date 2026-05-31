---
name: visual-regression-debug
description: 系统化排查用户报告的视觉回归问题（如字体、间距、颜色等全局样式变化）
source: auto-skill
extracted_at: '2026-05-31T03:32:47.014Z'
---

# 视觉回归排查方法

当用户报告代码修改后出现视觉差异（如"全局字体变大""间距不对""样式变了"）时，使用以下系统化排查流程。

## 第一步：界定范围

在开始代码检查前，先确认：
- 是**所有页面**还是**特定页面**（如仅 /about 页）？
- 与什么版本对比？是部署后的线上版本，还是本地开发环境？
- Vercel / 部署平台是否已完成新构建？（git push 后部署可能尚未完成）
- **注意用户语言的模糊性**：用户可能用不精确的术语描述同一问题。例如"字体变大了"和"变淡了/变浅了"可能是两个不同的问题（字号 vs 颜色），也可能是对同一视觉变化的不同描述（如字重变细同时让字看起来更大更淡）。需要追问澄清具体现象。

## 第二步：检查代码层面的可能源头

按影响面从大到小的顺序检查：

### 1. 全局 CSS 文件
```
app/globals.css        # Tailwind 入口 + 自定义全局样式
app/layout.tsx         # 是否有额外的 <style> 或 CSS 文件引用
```

### 2. 每个新增/修改的组件
查找以下问题模式：
- 组件内 `<style>` 标签（注入全局 CSS）
- CSS-in-JS 方案（styled-jsx, emotion 等）
- motion / framer-motion 动画是否意外影响了布局样式
- Tailwind `@apply` 在全局作用域的定义

### 3. 配置 / 构建文件
```
package.json           # Tailwind CSS 版本是否改变？
next.config.ts/.mjs    # 是否有影响输出的配置变化？
tailwind.config.*      # 主题扩展、fontSize 默认值是否改变？
postcss.config.*       # PostCSS 插件变化
```

### 4. 依赖项
检查 `package.json` 中与样式相关的依赖版本：
- `tailwindcss`（v3→v4 的 Preflight 差异较大）
- `motion` / `framer-motion`
- `next` 版本
- 任何 UI 库（antd, @lobehub 等）

### 5. 配置注入的全局样式
检查 `config.yaml` 中的以下字段，它们通过 `CustomHead` → `HeadInjector` 注入全局：
```
appearance.customCSS    # 内联 <style> 注入
appearance.customHead   # 注入到 <head> 末尾
```
即使本次修改未改动这些字段，也要确认它们是否在前次修改中被写入过非预期内容。

### 6. 背景覆盖层（导致"变淡/变浅"感知）
`components/BackgroundProvider.tsx` 在配置了背景图时，会在页面顶部叠加一个白色透明层：
```
background: rgba(255, 255, 255, opacity)
```
如果 `config.yaml` 中 `appearance.background.opacity` 被修改，或背景图片 URL 变化，会导致整体页面感知为"变淡/变浅"。即使背景图未变化，新的背景配置获取逻辑（如双路径回退）也可能影响是否实际渲染了覆盖层。

### 7. 组件内容结构变化
即使 CSS 没变，以下 DOM 变化也会影响视觉：
- 新增的父容器元素引入了额外边距/填充
- 布局从 Server Component 改为 Client Component（hydration 差异）
- 动画库（motion）的 `AnimatePresence` 或 `motion.div` 改变了渲染方式

## 第三步：检查非代码因素

- **部署状态** — Vercel 自动部署可能还在排队/构建中，用户看到的是旧版
- **CDN 缓存** — CSS 文件可能被浏览器/CDN 缓存，刷新后消失
- **浏览器差异** — 检查是否在无痕窗口/不同浏览器中同样出现
- **用户感知偏差** — 新页面（如新创建的 /about 页）使用了更大的标题，用户可能误以为是"全局"变大了
- **本地构建验证** — 在本地执行 `npm run build`（或 `npm run check`），确认构建无错误；如果有误，构建报错可能导致线上回退到旧版或降级渲染
- **线上站点取样** — 使用 web_fetch 工具获取线上页面内容，确认线上确实部署了新代码（通过检查页面文字内容是否为最新版本）

## 第四步：报告与验证

向用户报告检查结果时，使用结构化格式：

```
## 检查结果

**确认修改的文件（均不涉及全局字体）：**
- file1 — 修改内容说明
- file2 — 修改内容说明

**未修改的关键文件（排除变化可能性）：**
- app/globals.css — 本次未修改
- package.json — 未修改

**可能的解释：**
1. 部署未完成 — ...
2. 新页面对比差异 — ...
3. 其他原因 — ...
```

## 何时使用此技能

- 用户说"视觉变了"但代码看起来没有问题
- 用户报告部署前后的视觉差异
- 需要区分"真实代码问题"和"部署/缓存/感知问题"

## 反模式

- ❌ 直接假设是某个 CSS 属性导致的问题
- ❌ 在与用户确认范围前就开始盲目修改代码
- ❌ 忽略部署状态就诊断代码问题
- ❌ 只看 diff 而忽略间接影响（如 motion 动画、DOM 结构变化）
