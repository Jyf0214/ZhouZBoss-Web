import React from 'react';
import Button from '@/components/ui/Button';
import { Plus, Trash2 } from 'lucide-react';
import FormField from './FormField';
import ToggleField from './ToggleField';

interface NavMenuItemData {
  id?: string;
  name: string;
  link: string;
  icon?: string;
}

interface NavMenuGroupData {
  id?: string;
  title: string;
  item: NavMenuItemData[];
}

interface NavConfigData {
  enable: boolean;
  travelling: boolean;
  clock: boolean;
  menu: NavMenuGroupData[];
}

interface NavConfigProps {
  config: NavConfigData;
  onChange: (config: NavConfigData) => void;
}

export default function NavConfig({ config, onChange }: NavConfigProps) {
  const updateMenu = (menu: NavMenuGroupData[]) => onChange({ ...config, menu });

  const addGroup = () => {
    updateMenu([...config.menu, { id: crypto.randomUUID(), title: '', item: [] }]);
  };

  const removeGroup = (gi: number) => {
    updateMenu(config.menu.filter((_, i) => i !== gi));
  };

  const updateGroup = (gi: number, group: NavMenuGroupData) => {
    const next = [...config.menu];
    next[gi] = group;
    updateMenu(next);
  };

  const addItem = (gi: number) => {
    const group = config.menu[gi]!;
    updateGroup(gi, { ...group, item: [...group.item, { id: crypto.randomUUID(), name: '', link: '', icon: '' }] });
  };

  const removeItem = (gi: number, ii: number) => {
    const group = config.menu[gi]!;
    updateGroup(gi, { ...group, item: group.item.filter((_, i) => i !== ii) });
  };

  const updateItem = (gi: number, ii: number, item: NavMenuItemData) => {
    const group = config.menu[gi]!;
    const items = [...group.item];
    items[ii] = item;
    updateGroup(gi, { ...group, item: items });
  };

  return (
    <div className="space-y-4">
      <ToggleField
        label="启用导航栏"
        description="关闭后导航菜单整体隐藏"
        checked={config.enable}
        onChange={v => onChange({ ...config, enable: v })}
      />

      <div className="flex gap-4">
        <ToggleField
          label="旅行模式"
          description="显示旅行相关标识"
          checked={config.travelling}
          onChange={v => onChange({ ...config, travelling: v })}
        />
        <ToggleField
          label="显示时钟"
          description="导航栏显示当前时间"
          checked={config.clock}
          onChange={v => onChange({ ...config, clock: v })}
        />
      </div>

      <div className="border-t border-zinc-100 pt-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium">导航菜单</label>
          <Button size="sm" icon={<Plus size={14} />} onClick={addGroup} autoLoading={false}>
            添加分组
          </Button>
        </div>

        {config.menu.length === 0 && (
          <p className="text-sm text-zinc-400 py-4 text-center bg-zinc-50 rounded-xl">
            暂无菜单分组，点击上方按钮添加
          </p>
        )}

        {config.menu.map((group, gi) => (
          <div key={group.id ?? gi} className="mb-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <FormField
                  label="分组标题"
                  value={group.title}
                  onChange={v => updateGroup(gi, { ...group, title: v })}
                  placeholder="例如：网页、项目"
                />
              </div>
              <Button
                variant="danger"
                size="sm"
                iconOnly
                icon={<Trash2 size={16} />}
                onClick={() => removeGroup(gi)}
                autoLoading={false}
                title="删除分组"
                className="mt-6"
              />
            </div>

            <div className="space-y-2">
              {group.item.map((item, ii) => (
                <div key={item.id ?? ii} className="flex items-center gap-2">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => updateItem(gi, ii, { ...item, name: e.target.value })}
                      placeholder="名称"
                      className="h-9 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
                    />
                    <input
                      type="text"
                      value={item.link}
                      onChange={e => updateItem(gi, ii, { ...item, link: e.target.value })}
                      placeholder="链接"
                      className="h-9 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
                    />
                    <input
                      type="text"
                      value={item.icon ?? ''}
                      onChange={e => updateItem(gi, ii, { ...item, icon: e.target.value })}
                      placeholder="图标 URL"
                      className="h-9 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
                    />
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    iconOnly
                    icon={<Trash2 size={14} />}
                    onClick={() => removeItem(gi, ii)}
                    autoLoading={false}
                    title="删除菜单项"
                    className="shrink-0"
                  />
                </div>
              ))}
              <Button variant="secondary" size="sm" block icon={<Plus size={12} />} onClick={() => addItem(gi)} autoLoading={false} rounded="sm">
                添加菜单项
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
