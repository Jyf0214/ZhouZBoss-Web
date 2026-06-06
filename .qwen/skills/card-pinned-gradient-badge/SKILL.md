---
name: card-pinned-gradient-badge
description: Conditional gradient badge on card body for pinned/highlighted status, matching HeroBanner style
source: auto-skill
extracted_at: '2026-06-06T02:54:34.021Z'
---

# 卡片置顶 / 高亮状态徽章模式

当需要在列表卡片中标识置顶、推荐或特殊状态时，使用深色渐变徽章置于内容区顶部，视觉风格与首页 HeroBanner 一致。

## 实现步骤

### 1. 添加图标导入

```tsx
import { Pin } from 'lucide-react'; // 或其他状态图标
```

### 2. 在卡片内容区顶部添加条件徽章

```tsx
{post.pinned && (
  <div className="inline-flex items-center gap-1.5 mb-3 self-start bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-700 px-2.5 py-1 rounded-lg">
    <Pin size={10} className="text-amber-400/80" />
    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
      {t('home.pinned')}
    </span>
  </div>
)}
```

### 3. 添加 i18n 键

在两个语言文件中分别添加：

```json
// zh-CN.json
"pinned": "置顶"

// en.json
"pinned": "Pinned"
```

### 4. 数据类型添加标记字段

确保类型定义包含条件标记：

```tsx
interface PostItem {
  // ... 其他字段
  pinned?: boolean;
}
```

### 5. 数据源透传标记

在服务端组件映射数据时透传：

```tsx
const posts = publicFiles.map((f) => ({
  // ... 其他字段
  pinned: f.meta.pinned === true,
}));
```

## 设计细节

- **背景**：`bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-700` — 与 HeroBanner 卡片背景一致
- **图标**：`text-amber-400/80` — 暖色高亮，在深色背景上形成对比
- **文本**：`text-[10px] font-bold uppercase tracking-[0.15em]` — 微型大写样式，与 HeroBanner 的 tag 标签一致
- **容器**：`self-start` — 徽章不撑满宽度，`rounded-lg` 小圆角

## 适用场景

- 置顶文章标记
- 推荐/精选内容标记
- 任何需要条件显示的状态徽章（只需更换图标和颜色）
