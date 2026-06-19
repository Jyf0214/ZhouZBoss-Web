import { loadConfig } from '@/lib/config';
import { HeadInjector } from './HeadInjector';
import { sanitizeHeadHtml, sanitizeCss } from './sanitize';

/**
 * 自定义 Head 注入组件
 * 从配置读取 customCSS 和 customHead，注入到页面中
 * customCSS 以内联 style 直接渲染（Server Component），经 sanitizeCss 消毒
 * customHead 通过客户端组件注入到 document.head，经 sanitizeHeadHtml 消毒
 */
export function CustomHead() {
  const config = loadConfig();
  const { customCSS, customHead } = config.appearance;

  return (
    <>
      {customCSS && (
        <style dangerouslySetInnerHTML={{ __html: sanitizeCss(customCSS) }} />
      )}
      {customHead && (
        <HeadInjector content={sanitizeHeadHtml(customHead)} />
      )}
    </>
  );
}
