import { type ButtonHTMLAttributes, type ReactNode, memo, forwardRef } from 'react';
import { cn } from '@/lib/ui';

type ButtonVariant = 'primary' | 'default' | 'secondary' | 'danger' | 'ghost' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-zinc-900 text-white hover:bg-zinc-800 active:bg-zinc-700',
  default: 'bg-white border border-zinc-300 text-zinc-700 hover:border-zinc-400 hover:text-zinc-900',
  secondary: 'border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-800',
  danger: 'bg-white border border-red-300 text-red-600 hover:border-red-500 hover:bg-red-50',
  ghost: 'text-zinc-600 hover:bg-zinc-100',
  link: 'text-zinc-900 hover:underline',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

/**
 * 自定义按钮组件 — 支持 primary/default/danger 等变体
 */
export const Button = memo(
  forwardRef<HTMLButtonElement, ButtonProps>(
    ({ children, variant = 'default', size = 'md', loading, icon, className, disabled, ...props }, ref) => {
      return (
        <button
          ref={ref}
          disabled={disabled || loading}
          className={cn(
            'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
            variantStyles[variant],
            sizeStyles[size],
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
