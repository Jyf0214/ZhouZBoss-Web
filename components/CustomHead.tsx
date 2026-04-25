import { loadConfigAsync } from '@/lib/config';

/**
 * 自定义 Head 注入组件
 * 从配置读取 customCSS 和 customHead，注入到页面中
 * 此组件在服务端渲染，确保内容在 HTML 初始加载时就存在
 */
export async function CustomHead() {
  const config = await loadConfigAsync();
  const { customCSS, customHead } = config.appearance;

  return (
    <>
      {customCSS && (
        <style dangerouslySetInnerHTML={{ __html: customCSS }} />
      )}
      {customHead && (
        <div dangerouslySetInnerHTML={{ __html: customHead }} />
      )}
    </>
  );
}
