import React from 'react';
import FormField from './FormField';
import ToggleField from './ToggleField';

interface CopyrightConfigData {
  enable: boolean;
  decode: boolean;
  authorHref: string;
  location: string;
  license: string;
  licenseUrl: string;
  avatarSinks: boolean;
  authorImgBack: string;
  authorImgFront: string;
  authorLink: string;
}

interface CopyrightConfigProps {
  config: CopyrightConfigData;
  onChange: (config: CopyrightConfigData) => void;
}

export default function CopyrightConfig({ config, onChange }: CopyrightConfigProps) {
  return (
    <div className="space-y-4">
      <ToggleField label="启用版权信息" checked={config.enable} onChange={v => onChange({ ...config, enable: v })} />
      <ToggleField label="解码 HTML" description="是否解码版权信息中的 HTML" checked={config.decode} onChange={v => onChange({ ...config, decode: v })} />
      <ToggleField label="头像下沉" description="悬停时头像下沉效果" checked={config.avatarSinks} onChange={v => onChange({ ...config, avatarSinks: v })} />

      <div className="grid grid-cols-2 gap-4">
        <FormField label="作者链接" value={config.authorLink} onChange={v => onChange({ ...config, authorLink: v })} placeholder="/" />
        <FormField label="作者地址" value={config.authorHref} onChange={v => onChange({ ...config, authorHref: v })} placeholder="https://" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="所在地" value={config.location} onChange={v => onChange({ ...config, location: v })} placeholder="中国" />
        <FormField label="许可证" value={config.license} onChange={v => onChange({ ...config, license: v })} placeholder="CC BY-NC-SA 4.0" />
      </div>
      <FormField label="许可证链接" value={config.licenseUrl} onChange={v => onChange({ ...config, licenseUrl: v })} placeholder="https://creativecommons.org/licenses/by-nc-sa/4.0/" />
      <div className="grid grid-cols-2 gap-4">
        <FormField label="作者头像前图" value={config.authorImgFront} onChange={v => onChange({ ...config, authorImgFront: v })} placeholder="图片 URL" />
        <FormField label="作者头像后图" value={config.authorImgBack} onChange={v => onChange({ ...config, authorImgBack: v })} placeholder="图片 URL" />
      </div>
    </div>
  );
}
