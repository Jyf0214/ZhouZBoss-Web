/**
 * app/files/[...path]/route.ts 测试
 * 覆盖: 路径校验、前置条件、stat、HTTP/2 下载、HTTPS 回退、错误处理
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FileStat, ResponseDataDetailed } from 'webdav';
import type { NextRequest } from 'next/server';
import { EventEmitter } from 'node:events';

const mocks = vi.hoisted(() => ({
  _stat: vi.fn<() => Promise<FileStat | ResponseDataDetailed<FileStat>>>(),
  _getSession: vi.fn<() => Promise<unknown>>(),
  _checkAccess: vi.fn<() => Promise<{ allowed: boolean; reason?: string }>>(),
  _isWebDavConfigured: vi.fn<() => boolean>(),
  _http2Connect: vi.fn(),
  _httpsGet: vi.fn(),
  _rateLimit: vi.fn((_key: string, _limit: number, _windowMs: number) => ({ allowed: true, retryAfterMs: 0 })),
  _getClientIp: vi.fn((_req: NextRequest) => '127.0.0.1'),
}));

vi.mock('@/lib/storage/storage-provider', () => ({
  isStorageConfigured: () => mocks._isWebDavConfigured(),
  getStorageProvider: () => Promise.resolve({ stat: mocks._stat }),
}));
vi.mock('@/lib/auth', () => ({ getSession: () => mocks._getSession() }));
vi.mock('@/lib/storage/acl', () => ({ checkAccess: () => mocks._checkAccess() }));
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (key: string, limit: number, windowMs: number) => mocks._rateLimit(key, limit, windowMs),
  getClientIp: (req: NextRequest) => mocks._getClientIp(req),
}));
vi.mock('node:http2', () => ({
  default: { connect: (...a: unknown[]) => mocks._http2Connect(...a) },
}));
vi.mock('node:https', () => ({
  default: { get: (...a: unknown[]) => mocks._httpsGet(...a) },
}));

function makeStat(overrides: Partial<FileStat> = {}): FileStat {
  return { filename: '/f', basename: 'f', type: 'file', size: 100, lastmod: '2025-01-01', mime: 'text/plain', etag: null, ...overrides };
}
function makeParams(path: string[]) { return { params: Promise.resolve({ path }) }; }

function makeMockSession(body: string, fail = false) {
  return () => {
    const session = new EventEmitter() as EventEmitter & { close: ReturnType<typeof vi.fn>; request: ReturnType<typeof vi.fn> };
    session.close = vi.fn();
    const req = new EventEmitter() as EventEmitter & { end: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn>; resume: ReturnType<typeof vi.fn>; setTimeout: ReturnType<typeof vi.fn> };
    req.end = vi.fn(); req.close = vi.fn(); req.resume = vi.fn(); req.setTimeout = vi.fn();
    session.request = vi.fn(() => {
      process.nextTick(() => {
        if (fail) { req.emit('error', new Error('http2 fail')); return; }
        req.emit('response', { ':status': 200 });
        process.nextTick(() => { req.emit('data', Buffer.from(body)); process.nextTick(() => req.emit('end')); });
      });
      return req;
    });
    return session;
  };
}

function makeMockHttps(body: string, statusCode = 200) {
  return (_url: string, _opts: unknown, cb: (res: unknown) => void) => {
    const res = new EventEmitter();
    (res as unknown as { statusCode: number }).statusCode = statusCode;
    cb(res);
    process.nextTick(() => { res.emit('data', Buffer.from(body)); res.emit('end'); });
    const req = new EventEmitter() as EventEmitter & { setTimeout: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> };
    req.setTimeout = vi.fn(); req.destroy = vi.fn();
    return req;
  };
}

function makeHttpsError(msg: string) {
  return (_url: string, _opts: unknown, _cb: (res: unknown) => void) => {
    const req = new EventEmitter() as EventEmitter & { setTimeout: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> };
    req.setTimeout = vi.fn(); req.destroy = vi.fn();
    process.nextTick(() => req.emit('error', new Error(msg)));
    return req;
  };
}

async function callGet(path: string[]) {
  const { GET } = await import('@/app/files/[...path]/route');
  const req = { url: 'http://localhost/files/' + path.join('/') } as unknown as NextRequest;
  const res = await GET(req, makeParams(path));
  return { status: res.status, body: await res.text(), headers: Object.fromEntries(res.headers.entries()) };
}

beforeEach(() => {
  mocks._stat.mockReset(); mocks._getSession.mockReset(); mocks._checkAccess.mockReset();
  mocks._isWebDavConfigured.mockReset(); mocks._http2Connect.mockReset(); mocks._httpsGet.mockReset();
  mocks._rateLimit.mockReset(); mocks._getClientIp.mockReset();
  mocks._isWebDavConfigured.mockReturnValue(true);
  mocks._getSession.mockResolvedValue(null);
  mocks._checkAccess.mockResolvedValue({ allowed: true });
  mocks._rateLimit.mockReturnValue({ allowed: true, retryAfterMs: 0 });
  mocks._getClientIp.mockReturnValue('127.0.0.1');
  mocks._stat.mockResolvedValue(makeStat());
  mocks._http2Connect.mockImplementation(makeMockSession('ok'));
  process.env.WEBDAV_URL = 'https://app.koofr.net/dav/Koofr/Pages';
  process.env.WEBDAV_USER = 'u'; process.env.WEBDAV_PASS = 'p';
});

describe('输入校验', () => {
  it('空路径 → 400', async () => { const r = await callGet(['']); expect(r.status).toBe(400); });
  it('".." → 400', async () => { const r = await callGet(['a', '..', 'b']); expect(r.status).toBe(400); });
});
describe('前置条件', () => {
  it('未配置 → 503', async () => { mocks._isWebDavConfigured.mockReturnValue(false); const r = await callGet(['x']); expect(r.status).toBe(503); });
  it('ACL 拒绝 → 401', async () => { mocks._checkAccess.mockResolvedValue({ allowed: false }); const r = await callGet(['x']); expect(r.status).toBe(401); });
  it('ACL not-found → 404', async () => { mocks._checkAccess.mockResolvedValue({ allowed: false, reason: 'not-found' }); const r = await callGet(['x']); expect(r.status).toBe(404); });
});
describe('stat', () => {
  it('stat 错误 → 500', async () => { mocks._stat.mockRejectedValue(new Error('err')); const r = await callGet(['x']); expect(r.status).toBe(500); });
  it('stat 目录 → 404', async () => { mocks._stat.mockResolvedValue(makeStat({ type: 'directory' })); const r = await callGet(['x']); expect(r.status).toBe(404); });
});
describe('HTTP/2 下载', () => {
  it('成功 → 200 + 文件体', async () => {
    mocks._http2Connect.mockImplementation(makeMockSession('hello'));
    const r = await callGet(['p', 'f.html']);
    expect(r.status).toBe(200); expect(r.body).toBe('hello');
    // Content-Length 应使用实际 body 长度，而非 stat.size（TOCTOU 防护）
    expect(r.headers['content-length']).toBe(String(Buffer.from('hello').length));
  });
  it('text/html → attachment', async () => {
    mocks._stat.mockResolvedValue(makeStat({ mime: 'text/html' }));
    mocks._http2Connect.mockImplementation(makeMockSession('<h1>Hi</h1>'));
    const r = await callGet(['p']);
    expect(r.headers['content-disposition']).toBe('attachment');
  });
  it('image/png → inline', async () => {
    mocks._stat.mockResolvedValue(makeStat({ mime: 'image/png' }));
    mocks._http2Connect.mockImplementation(makeMockSession('png'));
    const r = await callGet(['p']);
    expect(r.headers['content-disposition']).toBe('inline');
  });
});
describe('HTTPS 回退', () => {
  it('http2 失败 → https 成功', async () => {
    mocks._http2Connect.mockImplementation(makeMockSession('', true));
    mocks._httpsGet.mockImplementation(makeMockHttps('fallback'));
    const r = await callGet(['p', 'f.html']);
    expect(r.status).toBe(200); expect(r.body).toBe('fallback');
  });
});
describe('错误处理', () => {
  it('两种都失败 → 502', async () => {
    mocks._http2Connect.mockImplementation(makeMockSession('', true));
    mocks._httpsGet.mockImplementation(makeHttpsError('fail'));
    const r = await callGet(['p', 'f.html']);
    expect(r.status).toBe(502);
  });
  it('params reject → 500', async () => {
    const { GET } = await import('@/app/files/[...path]/route');
    const req = { url: 'http://localhost/files/x' } as unknown as NextRequest;
    const res = await GET(req, { params: Promise.reject(new Error('boom')) });
    expect(res.status).toBe(500);
  });
});
