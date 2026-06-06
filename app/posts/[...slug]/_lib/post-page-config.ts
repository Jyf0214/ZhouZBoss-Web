import type { FrontendConfig } from '@/hooks/use-config';

export function buildTocConfig(appConfig: FrontendConfig) {
  return {
    enabled: appConfig.toc?.post ?? false,
    number: appConfig.toc?.number ?? true,
    expand: appConfig.toc?.expand ?? false,
    styleSimple: appConfig.toc?.styleSimple ?? false,
  };
}

export function buildShareSites(appConfig: FrontendConfig): string[] | undefined {
  const sitesStr = appConfig.share?.sharejs?.sites;
  if (!sitesStr || typeof sitesStr !== 'string') return undefined;
  return sitesStr.split(',').map((s) => s.trim()).filter(Boolean);
}

export function computeWordStats(content: string) {
  const wordCount = content.length;
  const readingTime = Math.ceil(wordCount / 500);
  const headingCount = (content.match(/^#{2,4}\s+.+$/gm) ?? []).length;
  return { wordCount, readingTime, headingCount };
}

export function buildCopyrightConfig(appConfig: FrontendConfig) {
  return {
    enable: appConfig.copyright?.enable ?? true,
    license: appConfig.copyright?.license ?? 'CC BY-NC-SA 4.0',
    licenseUrl: appConfig.copyright?.licenseUrl ?? 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    authorLink: appConfig.copyright?.authorLink ?? '/',
    authorImgFront: appConfig.copyright?.authorImgFront,
    location: appConfig.copyright?.location,
    decode: appConfig.copyright?.decode,
  };
}

export function buildShareConfig(appConfig: FrontendConfig) {
  return {
    enable: appConfig.share?.sharejs?.enable ?? false,
    sites: buildShareSites(appConfig),
  };
}

