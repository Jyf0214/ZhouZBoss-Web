'use client';

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

export interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
  /** 仅显示这些 key（不传则显示全部） */
  visibleKeys?: string[];
}

interface ShortcutItem {
  key: string;
  label: string;
}

/** 全站快捷键定义列表 */
const ALL_SHORTCUTS: ShortcutItem[] = [
  { key: '/', label: '搜索' },
  { key: 'Shift+?', label: '帮助' },
  { key: 'Escape', label: '关闭' },
  { key: 'j', label: '下一篇' },
  { key: 'k', label: '上一篇' },
];

function KbdKey({ keys }: { keys: string }) {
  // 支持 Shift+? 形式的多键组合
  const parts = keys.split('+');
  return (
    <span className="inline-flex items-center gap-1">
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-zinc-300 text-xs">+</span>}
          <kbd className="px-2 py-1 min-w-[28px] text-center rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-mono text-zinc-700 dark:text-zinc-300 shadow-sm">
            {part}
          </kbd>
        </React.Fragment>
      ))}
    </span>
  );
}

export function KeyboardShortcutsHelp({ open, onClose, visibleKeys }: KeyboardShortcutsHelpProps) {
  const shortcuts = visibleKeys
    ? ALL_SHORTCUTS.filter((s) => visibleKeys.includes(s.key))
    : ALL_SHORTCUTS;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="键盘快捷键"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm mx-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                快捷键
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="关闭"
              >
                <X size={16} className="text-zinc-400" />
              </button>
            </div>

            {/* 快捷键列表 */}
            <div className="px-5 py-3">
              {shortcuts.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between py-2.5 not-first:border-t not-first:border-zinc-50 dark:not-first:border-zinc-800"
                >
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {shortcut.label}
                  </span>
                  <KbdKey keys={shortcut.key} />
                </div>
              ))}
            </div>

            {/* 底部提示 */}
            <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
              <p className="text-xs text-zinc-400 text-center">
                在编辑框内快捷键自动禁用
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
