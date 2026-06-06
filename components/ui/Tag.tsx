import { type ReactNode, memo } from 'react';
import { cn } from '@/lib/ui';

type TagVariant = 'light' | 'dark' | 'outline' | 'emerald' | 'amber' | 'danger' | 'success' | 'warning';
type TagSize = 'sm' | 'md' | 'lg';

const variantStyles: Record<TagVariant, string> = {
  light: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  dark: 'bg-zinc-900 text-white border-zinc-800',
  outline: 'bg-white text-zinc-500 border-zinc-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  danger: 'bg-red-100 text-red-700 border-red-200',
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
};

const sizeStyles: Record<TagSize, string> = {
  sm: 'px-2 py-0.5 text-xs rounded',
  md: 'px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full',
  lg: 'px-4 py-1.5 text-sm font-medium rounded-full',
};

export interface TagProps {
  children: ReactNode;
  variant?: TagVariant;
  size?: TagSize;
  className?: string;
  onClick?: () => void;
}

/**
 * 自定义标签组件 — 支持 light/emerald/amber/danger 等变体
 */
export const Tag = memo<TagProps>(({ children, variant = 'light', size = 'md', className, onClick }) => {
  return (
    <span
      className={cn(
        'inline-block border',
        variantStyles[variant],
        sizeStyles[size],
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </span>
  );
});

Tag.displayName = 'Tag';
export default Tag;
