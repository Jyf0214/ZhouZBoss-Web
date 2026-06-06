import { type ButtonHTMLAttributes, type ReactNode, memo, forwardRef } from 'react';
import { cn } from '@/lib/ui';

type ButtonVariant = 'primary' | 'default' | 'secondary' | 'danger' | 'ghost' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonRounded = 'sm' | 'md' | 'lg' | 'full' | 'none';

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-zinc-900 text-white hover:bg-zinc-800 active:bg-zinc-700',
  default: 'bg-white border border-zinc-300 text-zinc-700 hover:border-zinc-400 hover:text-zinc-900',
  secondary: 'border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-800',
  danger: 'bg-white border border-red-300 text-red-600 hover:border-red-500 hover:bg-red-50',
  ghost: 'text-zinc-600 hover:bg-zinc-100',
  link: 'text-zinc-900 hover:underline',
};

const sizePadding: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

const iconOnlySize: Record<ButtonSize, string> = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const roundedStyles: Record<ButtonRounded, string> = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  full: 'rounded-full',
  none: 'rounded-none',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  rounded?: ButtonRounded;
  loading?: boolean;
  icon?: ReactNode;
  iconOnly?: boolean;
  block?: boolean;
}

/**
 * 自定义按钮组件 — 支持 primary/default/danger 等变体
 *
 * 新增功能：
 * - iconOnly：纯图标按钮，自动等宽高（square）
 * - rounded：独立控制圆角大小（sm/md/lg/full/none）
 * - block：块级按钮（w-full）
 */
export const Button = memo(
  forwardRef<HTMLButtonElement, ButtonProps>(
    ({ children, variant = 'default', size = 'md', rounded, loading, icon, iconOnly, block, className, disabled, ...props }, ref) => {
      const isIconOnly = iconOnly || (icon && !children);

      return (
        <button
          ref={ref}
          disabled={disabled || loading}
          className={cn(
            'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
            variantStyles[variant],
            isIconOnly ? iconOnlySize[size] : sizePadding[size],
            roundedStyles[rounded ?? (isIconOnly ? 'md' : 'md')],
            block && 'w-full',
            className,
          )}
          {...props}
        >
          {loading ? (
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : icon ? (
            <span className="flex-shrink-0">{icon}</span>
          ) : null}
          {children}
        </button>
      );
    },
  ),
);

Button.displayName = 'Button';
export default Button;
