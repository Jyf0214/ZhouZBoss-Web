/**
 * 存储后端未配置时的降级提示横幅
 *
 * 位于页面顶部,以 StatusCard 渲染。
 * 不阻塞页面渲染(其它模块仍可能可读),但明示上传/创建/删除已禁用。
 */
'use client';

import { XCircle } from 'lucide-react';
import { StatusCard } from '@/components/ui/StatusCard';

interface Props {
  message?: string;
}

export function StorageNotConfiguredBanner({ message }: Props) {
  return (
    <StatusCard
      icon={<XCircle size={20} />}
      title="存储后端未配置"
      status={
        message ??
        '请在环境变量中配置存储后端。WebDAV: WEBDAV_URL / WEBDAV_USER / WEBDAV_PASS | Backblaze B2: B2_KEY_ID / B2_APP_KEY / B2_BUCKET + STORAGE_TYPE=backblaze'
      }
      statusType="error"
      className="mb-4"
    />
  );
}

export default StorageNotConfiguredBanner;
