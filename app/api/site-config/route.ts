import { NextResponse } from 'next/server';
import { loadConfig } from '@/lib/config';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/site-config');

/**
 * 站点配置 API（客户端可访问）
 * 返回外观配置和站点信息，不暴露访问控制规则
 */
export function GET() {
  logger.info('GET', '读取站点配置');
  const config = loadConfig();
  logger.info('GET', '站点配置读取成功');
  return NextResponse.json({
    site: config.site,
    appearance: {
      background: config.appearance.background,
      customCSS: config.appearance.customCSS,
      loading: {
        slogans: config.appearance.loading?.slogans ?? [],
      },
    },
  });
}
