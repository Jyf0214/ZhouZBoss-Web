'use client';

import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { Button } from '@/components/ui/Button';

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

  const currentLang = locales.find(l => l.code === locale) ?? locales[0]!;

  return (
    <div className="relative">
      <Button variant="default" size="sm" block onClick={() => setIsOpen(!isOpen)} className="justify-start bg-transparent">
        <Globe size={14} className="text-zinc-500" />
        <span>{currentLang.flag}</span>
        <span>{currentLang.name}</span>
      </Button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[999]" onClick={() => setIsOpen(false)} />
          <div className="absolute bottom-full left-0 mb-1 bg-white border border-zinc-200 rounded-lg shadow-lg overflow-hidden z-[1000] min-w-[150px]">
            {locales.map(l => (
              <Button
                key={l.code}
                onClick={() => handleSwitch(l.code)}
                variant="ghost"
                size="sm"
                block
                className={`justify-start ${locale === l.code ? 'bg-zinc-100' : ''}`}
              >
                <span>{l.flag}</span>
                <span>{l.name}</span>
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
