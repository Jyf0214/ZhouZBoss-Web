'use client';

import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { locale, setLocale } = useI18n();

  const locales = [
    { code: 'zh-CN' as const, name: '简体中文', flag: '🇨🇳' },
    { code: 'en' as const, name: 'English', flag: '🇺🇸' },
  ];

  const handleSwitch = (code: 'zh-CN' | 'en') => {
    setLocale(code);
    setIsOpen(false);
  };

  const currentLang = locales.find(l => l.code === locale) || locales[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 w-full px-3 py-2 bg-transparent border border-zinc-200 rounded-lg cursor-pointer text-[13px] hover:border-zinc-300 transition-colors"
      >
        <Globe size={14} className="text-zinc-500" />
        <span>{currentLang.flag}</span>
        <span>{currentLang.name}</span>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[999]" onClick={() => setIsOpen(false)} />
          <div className="absolute bottom-full left-0 mb-1 bg-white border border-zinc-200 rounded-lg shadow-lg overflow-hidden z-[1000] min-w-[150px]">
            {locales.map(l => (
              <button
                key={l.code}
                onClick={() => handleSwitch(l.code)}
                className={`flex items-center gap-2 w-full px-4 py-2.5 border-none cursor-pointer text-sm text-left hover:bg-zinc-50 transition-colors ${
                  locale === l.code ? 'bg-zinc-50' : ''
                }`}
              >
                <span>{l.flag}</span>
                <span>{l.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
