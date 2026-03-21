/**
 * Auth Layout Styles
 * 
 * 认证页面样式 - 复制自 LobeChat
 * 
 * @see https://github.com/lobehub/lobe-chat - branch: canary, commit: 81bd6dc
 * @author LobeChat Team
 * @copyright LobeHub. All rights reserved.
 */
import { createStaticStyles } from 'antd-style';

export const styles = createStaticStyles(({ css, cssVar }) => ({
  divider: css`
    height: 24px;
  `,

  // Inner container - dark mode
  innerContainerDark: css`
    position: relative;

    overflow: hidden;

    border: 1px solid ${cssVar.colorBorderSecondary};
    border-radius: ${cssVar.borderRadius};

    background: ${cssVar.colorBgContainer};
  `,

  // Inner container - light mode
  innerContainerLight: css`
    position: relative;

    overflow: hidden;

    border: 1px solid ${cssVar.colorBorder};
    border-radius: ${cssVar.borderRadius};

    background: ${cssVar.colorBgContainer};
  `,

  // Outer container
  outerContainer: css`
    position: relative;
  `,
}));
