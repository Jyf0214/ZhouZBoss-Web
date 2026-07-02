'use client';

import type { TocItemProps } from './toc-types';
import {
  TOC_ITEM_BASE,
  TOC_ITEM_ACTIVE,
  TOC_ITEM_INACTIVE,
  TOC_LIST_TOP,
  TOC_LIST_NESTED,
  TOC_NUMBER,
} from './toc-styles';

/**
 * 递归渲染目录树。
 *
 * - 顶层为 ul（无缩进），子层为 ul（左侧缩进 ml-4）
 * - 每项为 li，内含锚点链接；当前激活项有高亮样式
 * - 启用 numbering 时，渲染层级编号（如 1 / 1.1 / 1.1.1）
 */
export function TocItem({
  items,
  activeId,
  depth = 0,
  numbering,
  prefix = '',
  onLinkClick,
}: TocItemProps) {
  let counter = 0;

  return (
    <ul className={depth === 0 ? TOC_LIST_TOP : TOC_LIST_NESTED}>
      {items.map((item) => {
        counter++;
        const num = prefix ? `${prefix}.${counter}` : `${counter}`;
        const isActive = activeId === item.id;

        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                onLinkClick?.();
              }}
              className={`
                ${TOC_ITEM_BASE}
                ${isActive ? TOC_ITEM_ACTIVE : TOC_ITEM_INACTIVE}
              `}
            >
              {numbering && (
                <span className={TOC_NUMBER}>{num}</span>
              )}
              {item.text}
            </a>
            {item.children.length > 0 && (
              <TocItem
                items={item.children}
                activeId={activeId}
                depth={depth + 1}
                numbering={numbering}
                prefix={num}
                onLinkClick={onLinkClick}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default TocItem;
