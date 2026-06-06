---
name: filter-pagination-pattern
description: Client-side pagination with filter-aware page reset for React/Tailwind list views
source: auto-skill
extracted_at: '2026-06-06T02:16:38.804Z'
---

# 带筛选重置的客户端分页模式

当 React 组件中同时存在客户端筛选/搜索和分页时，筛选条件变化后当前页可能无效。以下模式使用 `useEffect` 自动将页码重置为 1。

## 实现步骤

### 1. 添加状态和常量

```tsx
const [currentPage, setCurrentPage] = useState(1);
const pageSize = 8; // 每页条数
```

### 2. 筛选条件变化时重置页码

```tsx
useEffect(() => {
  setCurrentPage(1);
}, [searchTerm, selectedTag, selectedCategory]); // 列出所有筛选状态
```

### 3. 计算分页数据

```tsx
const totalPages = Math.ceil(filteredPosts.length / pageSize);
const paginatedPosts = filteredPosts.slice(
  (currentPage - 1) * pageSize,
  currentPage * pageSize
);
```

### 4. 分页 UI（与项目风格一致）

使用与项目标签筛选按钮一致的样式：
- 选中页：深色填充 `bg-zinc-900 text-white shadow-lg`
- 未选中页：白色描边 `bg-white text-zinc-600 border border-zinc-200`

```tsx
{totalPages > 1 && (
  <div className="flex items-center justify-center gap-2 mt-10">
    <button
      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
      disabled={currentPage === 1}
      className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300 hover:text-zinc-700"
    >
      <ChevronLeft size={16} />
      <span className="hidden sm:inline">{t('common.previous')}</span>
    </button>
    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
      <button
        key={page}
        onClick={() => setCurrentPage(page)}
        className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
          page === currentPage
            ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/20'
            : 'bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300 hover:text-zinc-700'
        }`}
      >
        {page}
      </button>
    ))}
    <button
      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
      disabled={currentPage === totalPages}
      className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300 hover:text-zinc-700"
    >
      <span className="hidden sm:inline">{t('common.next')}</span>
      <ChevronRight size={16} />
    </button>
  </div>
)}
```

## 注意事项

- `useEffect` 的依赖数组必须包含所有会影响分页结果的筛选状态
- 如果筛选结果少于 1 页（`totalPages <= 1`），不显示分页控件
- 分页 UI 样式应与项目现有的标签/筛选按钮一致，维持统一视觉语言
- 在 `AnimatePresence` 中使用 `key={post.slug}` 确保动画正确触发
