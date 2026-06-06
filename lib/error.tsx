/**
 * 错误消息展示工具
 * 提供带一键复制功能的错误提示
 */

import { message } from 'antd';
import React from 'react';
import { Button } from '@/components/ui/Button';

const copiedKey = 'copied-feedback';

export function showError(msg: string, duration = 4) {
  const key = `error-${Date.now()}`;
  message.error({
    content: (
      <span>
        {msg}
        <Button
          variant="ghost"
          size="sm"
          rounded="sm"
          className="ml-3"
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(msg).then(() => {
              message.success({ content: '已复制到剪贴板', key: copiedKey, duration: 1.5 });
            }).catch(() => {
              message.error({ content: '复制失败', key: copiedKey, duration: 1.5 });
            });
          }}
          title="点击复制错误信息"
        >
          📋复制
        </Button>
      </span>
    ),
    key,
    duration,
  });
}