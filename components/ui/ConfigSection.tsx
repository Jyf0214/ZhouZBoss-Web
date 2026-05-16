import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface ConfigSectionProps {
  title: string;
  icon?: LucideIcon;
  color?: string;
  children: React.ReactNode;
  className?: string;
}

export default function ConfigSection({
  title,
  icon: Icon,
  color = 'bg-zinc-500',
  children,
  className = '',
}: ConfigSectionProps) {
  return (
    <div className={`bg-white rounded-2xl border border-zinc-100 p-6 ${className}`}>
      <h2 className="text-base font-bold text-zinc-900 mb-4 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        {Icon && <Icon size={16} />}
        {title}
      </h2>
      {children}
    </div>
  );
}
