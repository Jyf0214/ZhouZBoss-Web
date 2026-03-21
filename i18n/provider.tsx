'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useLocale } from 'next-intl';
import { ReactNode } from 'react';

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  
  return (
    <NextIntlClientProvider locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}
