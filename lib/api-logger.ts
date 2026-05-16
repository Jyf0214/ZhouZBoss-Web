/**
 * 统一日志工具
 * 为所有 API 端点提供结构化日志记录
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  endpoint: string;
  method: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * 格式化日志条目
 */
function formatLogEntry(entry: LogEntry): string {
  return JSON.stringify({
    time: entry.timestamp,
    level: entry.level.toUpperCase(),
    endpoint: entry.endpoint,
    method: entry.method,
    message: entry.message,
    ...(entry.details && { details: entry.details }),
  });
}

/**
 * 记录日志
 */
function log(level: LogLevel, endpoint: string, method: string, message: string, details?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    endpoint,
    method,
    message,
    details,
  };

  const formatted = formatLogEntry(entry);

  switch (level) {
    case 'info':
    case 'debug':
      console.warn(`[API] ${formatted}`);
      break;
    case 'warn':
      console.warn(`[API] ${formatted}`);
      break;
    case 'error':
      console.error(`[API] ${formatted}`);
      break;
  }
}

/**
 * API 日志助手
 */
export function createApiLogger(endpoint: string) {
  return {
    info: (method: string, message: string, details?: Record<string, unknown>) =>
      log('info', endpoint, method, message, details),
    warn: (method: string, message: string, details?: Record<string, unknown>) =>
      log('warn', endpoint, method, message, details),
    error: (method: string, message: string, details?: Record<string, unknown>) =>
      log('error', endpoint, method, message, details),
    debug: (method: string, message: string, details?: Record<string, unknown>) =>
      log('debug', endpoint, method, message, details),
  };
}

export default createApiLogger;
