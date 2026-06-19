import { loadConfig } from '@/lib/config';
import { HeadInjector } from './HeadInjector';
import { sanitizeCss, sanitizeHeadHtml } from './sanitize';

/**
 * 自定义 Head 注入组件
 * 从配置读取 customCSS 和 customHead，注入到页面中
 * customCSS 以内联 style 直接渲染（Server Component）
 * customHead 通过客户端组件注入到 document.head
 * 渲染前对两种内容进行消毒，防止存储型 XSS
 */
export function CustomHead() {
  const config = loadConfig();
  const { customCSS, customHead } = config.appearance;

  const safeCSS = customCSS ? sanitizeCss(customCSS) : '';
  const safeHead = customHead ? sanitizeHeadHtml(customHead) : '';

  return (
    <>
      {safeCSS && (
        <style dangerouslySetInnerHTML={{ __html: safeCSS }} />
      )}
      {safeHead && (
        <HeadInjector content={safeHead} />
      )}
    </>
  );
}
