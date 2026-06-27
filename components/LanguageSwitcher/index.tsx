'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Globe } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { Button } from '@/components/ui/Button';

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { locale, setLocale } = useI18n();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const locales = [
    { code: 'zh-CN' as const, name: '中文' },
    { code: 'en' as const, name: 'EN' },
  ];

  const handleSwitch = (code: 'zh-CN' | 'en') => {
    setLocale(code);
    setIsOpen(false);
  };

  // 点击外部关闭下拉菜单
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      wrapperRef.current && !wrapperRef.current.contains(e.target as Node) &&
      dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
    ) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, handleClickOutside]);

  const currentLang = locales.find(l => l.code === locale) ?? locales[0]!;

  return (
    <div ref={wrapperRef} className="relative">
      <Button variant="default" size="sm" onClick={() => setIsOpen(!isOpen)} className="justify-start bg-transparent" autoLoading={false}>
        <Globe size={14} className="text-zinc-500" />
        <span className="text-xs font-medium">{currentLang.name}</span>
      </Button>
      {isOpen && (
        <div
          ref={dropdownRef}
          className="bg-white border border-zinc-200 rounded-lg shadow-lg overflow-hidden z-[1000] min-w-[150px] fixed"
          style={{
            top: wrapperRef.current ? wrapperRef.current.getBoundingClientRect().bottom + 4 : 68,
            left: wrapperRef.current ? wrapperRef.current.getBoundingClientRect().left : 0,
          }}
        >
          {locales.map(l => (
            <Button
              key={l.code}
              onClick={() => handleSwitch(l.code)}
              variant="ghost"
              size="sm"
              block
              className={`justify-start ${locale === l.code ? 'bg-zinc-100' : ''}`}
              autoLoading={false}
            >
              <span>{l.name}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
