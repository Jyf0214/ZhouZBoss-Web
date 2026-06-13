/**
 * 帖子详情页专用翻译（可安全在客户端使用）
 * 与 post-utils.ts 分离，避免客户端 bundle 引入服务端 fs 模块
 */

const I18N_MAP: Record<string, string> = {
  title: '帖子',
  backToPosts: '返回帖子列表',
};

export function tPosts(key: string): string {
  return I18N_MAP[key] ?? key;
}
