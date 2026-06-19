import type { ComponentType } from 'react';
import { Copy } from 'lucide-react';
import type { CodeProps, HighlightConfig, HighlighterInstance } from './types';
import { createHeading } from './HeadingAnchor';
import { CodeBlock } from './CodeBlock';

/** 主题名映射：配置项 → react-syntax-highlighter 内置样式 */
const themeMap: Record<string, string> = {
  light: 'oneLight',
  dark: 'vscDarkPlus',
};

/** 解析主题名，未匹配时回退到 vscDarkPlus */
export function resolveTheme(theme: string): string {
  return themeMap[theme] ?? 'vscDarkPlus';
}

/** 提取代码块语言标签（从 className 中匹配 language-xxx） */
function extractLanguage(className: string | undefined): string {
  const match = /language-(\w+)/.exec(className ?? '');
  return match?.[1] ?? '';
}

/** 构建 react-markdown 的 components 映射表 */
export function buildComponents(
  cfg: HighlightConfig,
  highlighter: HighlighterInstance | null,
): Record<string, ComponentType<CodeProps>> {
  return {
    pre({ children }: { children: React.ReactNode }) {
      // 直接透传子元素，避免与 CodeBlock 内部 div 产生多余嵌套
      return <>{children}</>;
    },
    code({ inline, className, children, ...props }: CodeProps) {
      const lang = extractLanguage(className);

      // 有语言标识的代码块 → 交给 CodeBlock 处理（含高亮、复制、折叠等完整功能）
      if (!inline && lang) {
        return (
          <CodeBlock
            children={String(children).replace(/\n$/, '')}
            language={lang}
            highlighter={highlighter}
            cfg={cfg}
          />
        );
      }

      // 无语言标识的代码块 → 添加语言标签和复制按钮
      if (!inline) {
        return (
          <pre className="relative group my-8 bg-zinc-900 rounded-2xl p-4 text-sm text-zinc-300 overflow-x-auto">
            {lang && <span className="code-lang-badge">{lang}</span>}
            <button
              className="code-copy-btn"
              onClick={() => {
                void navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
              }}
              title="复制代码"
            >
              <Copy size={14} />
            </button>
            <code>{children}</code>
          </pre>
        );
      }

      // 行内代码
      return (
        <code className="bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded-md text-[0.875em] font-mono font-medium" {...props}>
          {children}
        </code>
      );
    },
    h1: createHeading(1),
    h2: createHeading(2),
    h3: createHeading(3),
    h4: createHeading(4),
    h5: createHeading(5),
    h6: createHeading(6),
  };
}
