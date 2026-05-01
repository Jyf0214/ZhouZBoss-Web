/**
 * 认证页面布局样式
 */
import { createStaticStyles } from 'antd-style';

export const authStyles = createStaticStyles(({ css, cssVar }) => ({
  outer: css`
    position: relative;
  `,
  innerDark: css`
    position: relative;
    overflow: hidden;
    border: 1px solid ${cssVar.colorBorderSecondary};
    border-radius: ${cssVar.borderRadius};
    background: ${cssVar.colorBgContainer};
  `,
  innerLight: css`
    position: relative;
    overflow: hidden;
    border: 1px solid ${cssVar.colorBorder};
    border-radius: ${cssVar.borderRadius};
    background: ${cssVar.colorBgContainer};
  `,
  divider: css`
    height: 24px;
  `,
}));
