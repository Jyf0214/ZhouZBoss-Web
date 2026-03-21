/**
 * Platform Utilities
 * 
 * 平台检测工具函数 - 参考 LobeChat utils
 * 
 * @see https://github.com/lobehub/lobe-chat - branch: canary, commit: 81bd6dc
 * @author LobeChat Team
 * @copyright LobeHub. All rights reserved.
 */

import { isOnServerSide } from './env';

/**
 * 获取用户代理解析器
 */
const getParser = () => {
  if (isOnServerSide) {
    return {
      getOS: () => ({ name: 'Node' }),
      getDevice: () => ({ type: undefined }),
      getResult: () => ({ browser: { name: 'Node' } }),
    };
  }

  const ua = navigator.userAgent;
  // Simple UA parsing without external dependencies
  const isMac = /Macintosh|MacIntel|MacPPC|Mac68K/.test(ua);
  const isWindows = /Windows NT/.test(ua);
  const isLinux = /Linux|X11/.test(ua);
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isMobile = /Mobile|Android|iPhone|iPad/.test(ua);

  let browserName = 'Unknown';
  if (/Edg/.test(ua)) browserName = 'Edge';
  else if (/Chrome/.test(ua)) browserName = 'Chrome';
  else if (/Safari/.test(ua)) browserName = 'Safari';
  else if (/Firefox/.test(ua)) browserName = 'Firefox';
  else if (/MSIE|Trident/.test(ua)) browserName = 'IE';

  return {
    getOS: () => ({
      name: isMac ? 'Mac OS' : isWindows ? 'Windows' : isLinux ? 'Linux' : isIOS ? 'iOS' : isAndroid ? 'Android' : 'Unknown',
    }),
    getDevice: () => ({ type: isMobile ? 'mobile' : undefined }),
    getResult: () => ({ browser: { name: browserName } }),
  };
};

/**
 * 获取操作系统名称
 */
export const getPlatform = () => {
  return getParser().getOS().name;
};

/**
 * 获取浏览器名称
 */
export const getBrowser = () => {
  return getParser().getResult().browser.name;
};

/**
 * 浏览器信息对象
 */
export const browserInfo = {
  browser: getBrowser(),
  isMobile: getParser().getDevice().type === 'mobile',
  os: getParser().getOS().name,
};

/**
 * 检查是否为 macOS
 */
export const isMacOS = () => getPlatform() === 'Mac OS';

/**
 * 检查是否为移动设备
 */
export const isMobile = () => getParser().getDevice().type === 'mobile';

/**
 * 检查是否为 Safari 浏览器
 */
export const isSafari = () => getBrowser() === 'Safari';

/**
 * 检查是否为 Chrome 浏览器
 */
export const isChrome = () => getBrowser() === 'Chrome';

/**
 * 检查是否为 Firefox 浏览器
 */
export const isFirefox = () => getBrowser() === 'Firefox';
