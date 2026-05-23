import React from 'react';
import FormField from './FormField';

interface ErrorImgConfigData {
  flink: string;
  postPage: string;
}

interface ErrorImgConfigProps {
  config: ErrorImgConfigData;
  onChange: (config: ErrorImgConfigData) => void;
}

export default function ErrorImgConfig({ config, onChange }: ErrorImgConfigProps) {
  return (
    <div className="space-y-4">
      <FormField
        label="友链错误图片"
        value={config.flink}
        onChange={v => onChange({ ...config, flink: v })}
        placeholder="/img/friend_404.gif"
      />
      <FormField
        label="文章错误图片"
        value={config.postPage}
        onChange={v => onChange({ ...config, postPage: v })}
        placeholder="/img/404.jpg"
      />
    </div>
  );
}
