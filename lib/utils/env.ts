/**
 * 运行环境检测工具
 */

/** 是否为开发环境 */
export const isDev = process.env.NODE_ENV === 'development';

/** 是否运行在服务端（无 window 对象） */
export const isOnServerSide = typeof window === 'undefined';

/** 是否运行在客户端（有 window 对象） */
export const isOnClientSide = !isOnServerSide;

/** 是否为生产环境 */
export const isProd = process.env.NODE_ENV === 'production';
