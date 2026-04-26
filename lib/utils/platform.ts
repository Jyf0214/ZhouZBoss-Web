/**
 * 客户端平台与浏览器检测工具
 */

import { isOnServerSide } from './env';

/** 解析 User-Agent 字符串，提取平台和浏览器信息 */
function resolveUA() {
  if (isOnServerSide) {
    return { os: 'Node', browser: 'Node', isMobile: false };
  }

  const ua = navigator.userAgent;

  const isMac = /Macintosh|MacIntel|MacPPC|Mac68K/.test(ua);
  const isWindows = /Windows NT/.test(ua);
  const isLinux = /Linux|X11/.test(ua) && !/Android/.test(ua);
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const mobile = /Mobile|Android|iPhone|iPad/.test(ua);

  let os = 'Unknown';
  if (isMac) os = 'Mac OS';
  else if (isWindows) os = 'Windows';
  else if (isLinux) os = 'Linux';
  else if (isIOS) os = 'iOS';
  else if (isAndroid) os = 'Android';

  let browser = 'Unknown';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Safari\//.test(ua)) browser = 'Safari';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/MSIE|Trident\//.test(ua)) browser = 'IE';

  return { os, browser, isMobile: mobile };
}

const uaInfo = resolveUA();

/** 获取操作系统名称 */
export const getPlatform = (): string => uaInfo.os;

/** 获取浏览器名称 */
export const getBrowser = (): string => uaInfo.browser;

/** 浏览器与平台信息快照 */
export const browserInfo = {
  browser: uaInfo.browser,
  isMobile: uaInfo.isMobile,
  os: uaInfo.os,
};

/** 是否为 macOS */
export const isMacOS = (): boolean => uaInfo.os === 'Mac OS';

/** 是否为移动设备 */
export const isMobile = (): boolean => uaInfo.isMobile;

/** 是否为 Safari */
export const isSafari = (): boolean => uaInfo.browser === 'Safari';

/** 是否为 Chrome */
export const isChrome = (): boolean => uaInfo.browser === 'Chrome';

/** 是否为 Firefox */
export const isFirefox = (): boolean => uaInfo.browser === 'Firefox';
