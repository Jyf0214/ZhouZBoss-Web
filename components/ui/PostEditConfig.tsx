import React from 'react';
import FormField from './FormField';
import ToggleField from './ToggleField';

interface PostEditConfigData {
  enable: boolean;
  github: string | false;
}

interface PostEditConfigProps {
  config: PostEditConfigData;
  onChange: (config: PostEditConfigData) => void;
}

export default function PostEditConfig({ config, onChange }: PostEditConfigProps) {
  return (
    <div className="space-y-4">
      <ToggleField
        label="启用在线编辑"
        description="浏览时可直接跳转编辑源码"
        checked={config.enable}
        onChange={v => onChange({ ...config, enable: v })}
      />
      <FormField
        label="GitHub 编辑链接"
        value={typeof config.github === 'string' ? config.github : ''}
        onChange={v => onChange({ ...config, github: v || false })}
        placeholder="https://github.com/user/repo/edit/branch/path/"
      />
    </div>
  );
}
