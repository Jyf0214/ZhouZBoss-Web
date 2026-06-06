import { type InputHTMLAttributes, memo, forwardRef } from 'react';
import { cn } from '@/lib/ui';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * 自定义输入框组件
 */
export const Input = memo(
  forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, id, ...props }, ref) => {
      const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

      const inputEl = (
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-10 px-3 border border-zinc-200 rounded-lg text-sm',
            'outline-none transition-colors',
            'focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400',
            'placeholder:text-zinc-400',
            error && 'border-red-400 focus:border-red-500 focus:ring-red-500',
            className,
          )}
          {...props}
        />
      );

      if (!label && !error) return inputEl;

      return (
        <div className="w-full">
          {label && (
            <label htmlFor={inputId} className="block text-sm font-medium mb-2 text-zinc-700">
              {label}
            </label>
          )}
          {inputEl}
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      );
    },
  ),
);

Input.displayName = 'Input';
export default Input;
