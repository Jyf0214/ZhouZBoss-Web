---
name: group-name-slug-mapping
description: 内容分组筛选时通过 groupName→slug 映射解决 UI 标签与目录名不匹配
source: auto-skill
extracted_at: '2026-05-30T11:10:40.419Z'
---

# 分组筛选：groupName → slug 映射模式

## 问题场景

内容管理系统（如通讯录/文章列表）中，分组筛选按钮显示的是人类可读名称（`groupName`，如"朋友圈""同学录"），但实际内容项的 slug 路径使用的是目录名（如 `friends`/`classmates`）。直接比较两者永远无法匹配。

## 典型数据流

```
分组定义（index.md）：
  slug: "/friends"         ← 目录名
  groupName: "朋友圈"      ← 显示名
  title: "好友"

内容条目：
  slug: "friends/john-doe"  ← slug 首段是目录名
  title: "张三"
```

## 根因

- 筛选按钮显示 `groupName`（用户可见）
- 过滤时比较的是 `face.slug.split('/')[0]`（目录名）
- 两者是不同值，`!==` 永远为 `false`

## 解决方案：构建映射表

### 代码模板

```typescript
interface GroupItem {
  slug: string;        // "/friends"
  groupName?: string;  // "朋友圈"
}

interface ContentItem {
  slug: string;        // "friends/john-doe"
  // ...
}

function ContentList({ items, groups }: { items: ContentItem[]; groups: GroupItem[] }) {
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  // 1. 构建 groupName → slug 首段映射
  const groupMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groups) {
      if (g.groupName && g.slug) {
        const segment = g.slug.split('/').filter(Boolean)[0];
        if (segment) map.set(g.groupName, segment);
      }
    }
    return map;
  }, [groups]);

  // 2. 提取分组名列表（用于渲染按钮）
  const groupNames = useMemo(
    () => [...new Set(groups.map((g) => g.groupName).filter(Boolean))] as string[],
    [groups]
  );

  // 3. 筛选：通过映射转换后比较
  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (!activeGroup) return true;
      const itemSlug = item.slug.split('/').filter(Boolean)[0] ?? null;
      const expectedSlug = groupMap.get(activeGroup);
      return !!expectedSlug && itemSlug === expectedSlug;
    });
  }, [items, activeGroup, groupMap]);

  return (
    <div>
      {/* 分组按钮 */}
      {groupNames.map((name) => (
        <button
          key={name}
          onClick={() => setActiveGroup(name)}
          className={activeGroup === name ? 'active' : ''}
        >
          {name}
        </button>
      ))}

      {/* 内容列表 */}
      {filtered.map((item) => (
        <div key={item.slug}>{item.title}</div>
      ))}
    </div>
  );
}
```

## 关键要点

| 要素 | 说明 |
|------|------|
| `groupMap` | `useMemo` 缓存，`Map<string, string>` 结构 |
| 映射方向 | `groupName → slug 首段`（因为按钮用 groupName 标识） |
| 提取首段 | `g.slug.split('/').filter(Boolean)[0]` 取第一个非空段 |
| `useMemo` 依赖 | `[groups]` — 分组变化时才重建 |
| 筛选依赖 | 需包含 `groupMap`，否则筛选不会随映射更新 |

## 数据来源

分组定义通常来自目录下的 `index.md` 文件的 frontmatter：
```yaml
---
title: 好友
groupName: 朋友圈
---
```

## 适用场景

- 通讯录/联系人分组
- 文章/博客分类
- 任何 UI 标签 ≠ 内部标识符的内容分组
