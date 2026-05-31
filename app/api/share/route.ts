import { type NextRequest, NextResponse } from 'next/server';

/**
 * Share Event Tracking API
 *
 * 记录分享事件（可选，用于分析）
 * POST /api/share
 *
 * Request body:
 *   url: string    - 被分享的页面 URL
 *   title: string  - 被分享的页面标题
 *   platform: string - 分享目标平台（twitter, facebook, weibo, wechat, qq, telegram 等）
 *
 * Response:
 *   { success: true }
 */

interface SharePayload {
  url: string;
  title: string;
  platform: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SharePayload;

    if (!body.url || !body.platform) {
      return NextResponse.json(
        { error: '缺少必要参数: url, platform' },
        { status: 400 },
      );
    }

    // 记录分享事件到服务器日志
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      url: body.url,
      title: body.title ?? '(无标题)',
      platform: body.platform,
      referer: request.headers.get('referer') ?? '',
      userAgent: request.headers.get('user-agent') ?? '',
      ip: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown',
    };

    // 记录分享事件（生产环境可改为写入数据库或发送到分析服务）
    console.warn('[SHARE]', JSON.stringify(logEntry));

    // 返回分享链接（方便前端直接使用）
    const shareUrl = buildShareUrl(body.url, body.title, body.platform);

    return NextResponse.json({
      success: true,
      shareUrl,
      message: '分享事件已记录',
    });
  } catch (error) {
    console.error('[SHARE] 处理分享请求失败:', error);
    return NextResponse.json(
      { error: '分享请求处理失败' },
      { status: 500 },
    );
  }
}

/**
 * 构建分享 URL
 */
function buildShareUrl(url: string, title: string, platform: string): string | null {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareUrlMap: Record<string, string> = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    weibo: `https://service.weibo.com/share/share.php?title=${encodedTitle}&url=${encodedUrl}`,
    qq: `https://connect.qq.com/widget/shareqq/index.html?title=${encodedTitle}&url=${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
  };

  return shareUrlMap[platform] ?? null;
}
