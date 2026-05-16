import { NextResponse } from 'next/server';
import { loadConfigAsync } from '@/lib/config';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/site-config');

/**
 * 站点配置 API（客户端可访问）
 * 返回外观配置和站点信息，不暴露访问控制规则
 */
export async function GET() {
  logger.info('GET', '读取站点配置');
  const config = await loadConfigAsync();
  return NextResponse.json({
    site: config.site,
    appearance: {
      background: config.appearance.background,
      customCSS: config.appearance.customCSS,
      // customHead 不通过 API 暴露，仅在服务端注入
    },
  });
}
