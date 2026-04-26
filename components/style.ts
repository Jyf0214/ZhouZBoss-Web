/**
 * 认证页面布局样式
 */

import { createStaticStyles } from 'antd-style';

export const authStyles = createStaticStyles(({ css, cssVar }) => ({
  /** 外层容器 */
  outer: css`
    position: relative;
  `,

  /** 内层容器 — 深色模式 */
  innerDark: css`
    position: relative;
    overflow: hidden;
    border: 1px solid ${cssVar.colorBorderSecondary};
    border-radius: ${cssVar.borderRadius};
    background: ${cssVar.colorBgContainer};
  `,

  /** 内层容器 — 浅色模式 */
  innerLight: css`
    position: relative;
    overflow: hidden;
    border: 1px solid ${cssVar.colorBorder};
    border-radius: ${cssVar.borderRadius};
    background: ${cssVar.colorBgContainer};
  `,

  /** 分隔线 */
  divider: css`
    height: 24px;
  `,
}));
