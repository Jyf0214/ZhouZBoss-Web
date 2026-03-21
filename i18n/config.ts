/**
 * i18n Configuration for Originium Kernel
 * 默认语言：简体中文 (zh-CN)
 */

import { getRequestConfig } from 'next-intl/server';

export const locales = ['zh-CN', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'zh-CN';

export const localeNames: Record<Locale, string> = {
  'zh-CN': '简体中文',
  'en': 'English',
};

export default getRequestConfig(async ({ locale }) => {
  return {
    locale: locale || defaultLocale,
    messages: (await import(`./${locale || defaultLocale}.json`)).default,
    timeZone: 'Asia/Shanghai',
    now: new Date(),
  };
});
