import React from 'react';
import { Button } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import ToggleField from './ToggleField';

interface QRCodeItem {
  img: string;
  link: string;
  text: string;
}

interface RewardConfigData {
  enable: boolean;
  qrCodes: QRCodeItem[];
}

interface RewardConfigProps {
  config: RewardConfigData;
  onChange: (config: RewardConfigData) => void;
}

export default function RewardConfig({ config, onChange }: RewardConfigProps) {
  const addQR = () => {
    onChange({ ...config, qrCodes: [...config.qrCodes, { img: '', link: '', text: '' }] });
  };

  const removeQR = (i: number) => {
    onChange({ ...config, qrCodes: config.qrCodes.filter((_, idx) => idx !== i) });
  };

  const updateQR = (i: number, item: QRCodeItem) => {
    const next = [...config.qrCodes];
    next[i] = item;
    onChange({ ...config, qrCodes: next });
  };

  return (
    <div className="space-y-4">
      <ToggleField label="启用打赏" checked={config.enable} onChange={v => onChange({ ...config, enable: v })} />

      <div className="border-t border-zinc-100 pt-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium">收款二维码</label>
          <Button size="small" icon={<Plus size={14} />} onClick={addQR} className="rounded-lg">添加</Button>
        </div>

        {config.qrCodes.map((qr, i) => (
          <div key={i} className="mb-3 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
            <div className="flex items-center gap-2 mb-2">
              <input type="text" value={qr.text} onChange={e => updateQR(i, { ...qr, text: e.target.value })} placeholder="名称 (如微信)" className="flex-1 h-9 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400" />
              <button onClick={() => removeQR(i)} className="p-2 text-red-400 hover:text-red-600 rounded-lg"><Trash2 size={14} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={qr.img} onChange={e => updateQR(i, { ...qr, img: e.target.value })} placeholder="二维码图片 URL" className="h-9 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400" />
              <input type="text" value={qr.link} onChange={e => updateQR(i, { ...qr, link: e.target.value })} placeholder="链接 (可选)" className="h-9 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400" />
            </div>
          </div>
        ))}
        {config.qrCodes.length === 0 && (
          <p className="text-sm text-zinc-400 py-4 text-center bg-zinc-50 rounded-xl">暂无二维码</p>
        )}
      </div>
    </div>
  );
}
