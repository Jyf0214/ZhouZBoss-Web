/**
 * lib/storage/acl.ts 单元测试
 *
 * 覆盖范围:
 * - checkAccess:
 *   - WebDAV 未配置 → not-configured
 *   - 根目录(空路径) → not-found (不论是否登录)
 *   - 顶层文件(根目录下的文件) → 未登录拒绝、登录放行
 *   - public 顶层文件夹 → 未登录也放行
 *   - private 顶层文件夹 → 未登录拒绝、登录放行
 *   - 未配置顶层文件夹(无 DB 记录) → 私有
 *   - isFolderPublic 抛错 → 失败安全 (private)
 * - checkPageAccess:
 *   - DB 未配置 → public
 *   - 记录不存在 → public
 *   - public=true → public
 *   - public=false, password=null → password-required
 *   - public=false, password=正确 → public
 *   - public=false, password=错误 → wrong-password
 *   - DB 抛错 → db-error
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { IDatabase } from '@/lib/db';

// 用 vi.hoisted 把 mock 状态提到模块顶层,让 vi.mock 工厂能引用
const mocks = vi.hoisted(() => {
  const findUnique = vi.fn();
  return {
    findUnique,
    // 全部由 beforeEach 重新赋值,避免测试间状态污染
    getDb: vi.fn<() => IDatabase>(),
    isWebDavConfigured: vi.fn<() => boolean>(),
  };
});

vi.mock('@/lib/db', () => ({
  getDb: () => mocks.getDb(),
}));

vi.mock('@/lib/webdav', () => ({
  isWebDavConfigured: () => mocks.isWebDavConfigured(),
}));

vi.mock('@/lib/hash', () => ({
  verifyPassword: (password: string, stored: string) =>
    Promise.resolve(password === stored),
}));

// 构造一个最小可用的 IDatabase 桩 — 只实现 acl.ts 用到的 prisma 字段
function makeDbWithFolder(row: {
  path: string;
  public: boolean;
  password: string | null;
  description?: string | null;
} | null): IDatabase {
  mocks.findUnique.mockImplementation(({ where }: { where: { path: string } }) => {
    if (row?.path === where.path) {
      return Promise.resolve({
        path: row.path,
        public: row.public,
        password: row.password,
        description: row.description ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return Promise.resolve(null);
  });
  return {
    prisma: {
      storageFolder: { findUnique: mocks.findUnique },
    },
  } as unknown as IDatabase;
}

function makeDbUnconfigured(): IDatabase {
  return { prisma: null } as unknown as IDatabase;
}

function makeDbThrowing(): IDatabase {
  mocks.findUnique.mockRejectedValue(new Error('DB connection lost'));
  return {
    prisma: {
      storageFolder: { findUnique: mocks.findUnique },
    },
  } as unknown as IDatabase;
}

// 辅助:把一个文件夹的 public 字段返回 true/false (无密码字段)
function makeDbWithPublic(publicValue: boolean): IDatabase {
  mocks.findUnique.mockImplementation(({ where }: { where: { path: string } }) => {
    if (where.path === 'public-folder') {
      return Promise.resolve({
        path: 'public-folder',
        public: publicValue,
        password: null,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return Promise.resolve(null);
  });
  return {
    prisma: {
      storageFolder: { findUnique: mocks.findUnique },
    },
  } as unknown as IDatabase;
}

beforeEach(() => {
  mocks.findUnique.mockReset();
  mocks.getDb.mockReset();
  mocks.isWebDavConfigured.mockReset();
  // 默认: WebDAV 已配置,DB 提供无记录的 mock
  mocks.isWebDavConfigured.mockReturnValue(true);
  mocks.getDb.mockImplementation(() => makeDbWithFolder(null));
});

describe('checkAccess', () => {
  it('WebDAV 未配置 → 返回 not-configured', async () => {
    mocks.isWebDavConfigured.mockReturnValue(false);
    const { checkAccess } = await import('@/lib/storage/acl');
    const result = await checkAccess('public/img.png', false);
    expect(result).toEqual({ allowed: false, reason: 'not-configured' });
  });

  it('根目录(空路径)+ 未登录 → not-found', async () => {
    const { checkAccess } = await import('@/lib/storage/acl');
    const result = await checkAccess('', false);
    expect(result).toEqual({ allowed: false, reason: 'not-found' });
  });

  it('根目录(空路径)+ 已登录 → 仍 not-found (根目录不允许任何访问)', async () => {
    const { checkAccess } = await import('@/lib/storage/acl');
    const result = await checkAccess('', true);
    expect(result).toEqual({ allowed: false, reason: 'not-found' });
  });

  it('根目录下的顶层文件 + 未登录 → not-found', async () => {
    const { checkAccess } = await import('@/lib/storage/acl');
    const result = await checkAccess('readme.txt', false);
    expect(result).toEqual({ allowed: false, reason: 'not-found' });
  });

  it('根目录下的顶层文件 + 已登录 → 放行', async () => {
    const { checkAccess } = await import('@/lib/storage/acl');
    const result = await checkAccess('readme.txt', true);
    expect(result).toEqual({ allowed: true });
  });

  it('public 顶层文件夹 + 未登录 → 放行', async () => {
    mocks.getDb.mockImplementation(() => makeDbWithPublic(true));
    const { checkAccess } = await import('@/lib/storage/acl');
    const result = await checkAccess('public-folder/img.png', false);
    expect(result).toEqual({ allowed: true });
  });

  it('public 顶层文件夹 + 已登录 → 放行', async () => {
    mocks.getDb.mockImplementation(() => makeDbWithPublic(true));
    const { checkAccess } = await import('@/lib/storage/acl');
    const result = await checkAccess('public-folder/sub/deep.png', true);
    expect(result).toEqual({ allowed: true });
  });

  it('private 顶层文件夹 + 未登录 → 拒绝 (private)', async () => {
    mocks.getDb.mockImplementation(() => makeDbWithPublic(false));
    const { checkAccess } = await import('@/lib/storage/acl');
    const result = await checkAccess('private-folder/secret.md', false);
    expect(result).toEqual({ allowed: false, reason: 'private' });
  });

  it('private 顶层文件夹 + 已登录 → 放行', async () => {
    mocks.getDb.mockImplementation(() => makeDbWithPublic(false));
    const { checkAccess } = await import('@/lib/storage/acl');
    const result = await checkAccess('private-folder/secret.md', true);
    expect(result).toEqual({ allowed: true });
  });

  it('未配置的顶层文件夹(无 DB 记录)+ 未登录 → 拒绝 (private)', async () => {
    // 默认 mock: findUnique 返回 null
    const { checkAccess } = await import('@/lib/storage/acl');
    const result = await checkAccess('unconfigured-folder/x.txt', false);
    expect(result).toEqual({ allowed: false, reason: 'private' });
  });

  it('未配置的顶层文件夹 + 已登录 → 放行', async () => {
    const { checkAccess } = await import('@/lib/storage/acl');
    const result = await checkAccess('unconfigured-folder/x.txt', true);
    expect(result).toEqual({ allowed: true });
  });

  it('isFolderPublic 抛错 → 失败安全 (private)', async () => {
    mocks.getDb.mockImplementation(() => makeDbThrowing());
    const { checkAccess } = await import('@/lib/storage/acl');
    const result = await checkAccess('some-folder/x.txt', false);
    expect(result).toEqual({ allowed: false, reason: 'private' });
  });

  it('路径含前导/尾随斜杠 → 规范化后正确决策', async () => {
    mocks.getDb.mockImplementation(() => makeDbWithPublic(true));
    const { checkAccess } = await import('@/lib/storage/acl');
    const result = await checkAccess('/public-folder/img.png/', false);
    expect(result).toEqual({ allowed: true });
  });
});

describe('checkPageAccess', () => {
  it('DB 未配置 → 视为 public', async () => {
    mocks.getDb.mockImplementation(() => makeDbUnconfigured());
    const { checkPageAccess } = await import('@/lib/storage/acl');
    const result = await checkPageAccess('pages/secret.html', null);
    expect(result).toEqual({ allowed: true, reason: 'public' });
  });

  it('DB 抛错 → 返回 db-error (失败安全)', async () => {
    mocks.getDb.mockImplementation(() => makeDbThrowing());
    const { checkPageAccess } = await import('@/lib/storage/acl');
    const result = await checkPageAccess('pages/secret.html', null);
    expect(result).toEqual({ allowed: false, reason: 'db-error' });
  });

  it('目录无记录 → public', async () => {
    // 默认 mock 返回 null
    const { checkPageAccess } = await import('@/lib/storage/acl');
    const result = await checkPageAccess('pages/unknown.html', null);
    expect(result).toEqual({ allowed: true, reason: 'public' });
  });

  it('目录 public=true → public', async () => {
    mocks.getDb.mockImplementation(() =>
      makeDbWithFolder({ path: 'pages', public: true, password: null })
    );
    const { checkPageAccess } = await import('@/lib/storage/acl');
    const result = await checkPageAccess('pages/about.html', null);
    expect(result).toEqual({ allowed: true, reason: 'public' });
  });

  it('目录 public=false 且 password=null + 无 queryPwd → password-required', async () => {
    mocks.getDb.mockImplementation(() =>
      makeDbWithFolder({ path: 'pages', public: false, password: null })
    );
    const { checkPageAccess } = await import('@/lib/storage/acl');
    const result = await checkPageAccess('pages/secret.html', null);
    expect(result).toEqual({ allowed: false, reason: 'password-required' });
  });

  it('目录 public=false 且 password 已设 + 正确密码 → public', async () => {
    mocks.getDb.mockImplementation(() =>
      makeDbWithFolder({ path: 'pages', public: false, password: 'open-sesame' })
    );
    const { checkPageAccess } = await import('@/lib/storage/acl');
    const result = await checkPageAccess('pages/secret.html', 'open-sesame');
    expect(result).toEqual({ allowed: true, reason: 'public' });
  });

  it('目录 public=false 且 password 已设 + 错误密码 → wrong-password', async () => {
    mocks.getDb.mockImplementation(() =>
      makeDbWithFolder({ path: 'pages', public: false, password: 'open-sesame' })
    );
    const { checkPageAccess } = await import('@/lib/storage/acl');
    const result = await checkPageAccess('pages/secret.html', 'wrong-pwd');
    expect(result).toEqual({ allowed: false, reason: 'wrong-password' });
  });

  it('目录 public=false 且 password 已设 + 无 queryPwd → wrong-password', async () => {
    mocks.getDb.mockImplementation(() =>
      makeDbWithFolder({ path: 'pages', public: false, password: 'open-sesame' })
    );
    const { checkPageAccess } = await import('@/lib/storage/acl');
    const result = await checkPageAccess('pages/secret.html', null);
    expect(result).toEqual({ allowed: false, reason: 'wrong-password' });
  });

  it('目录 public=false 且 password 已设 + queryPwd 为空串 → wrong-password', async () => {
    mocks.getDb.mockImplementation(() =>
      makeDbWithFolder({ path: 'pages', public: false, password: 'open-sesame' })
    );
    const { checkPageAccess } = await import('@/lib/storage/acl');
    const result = await checkPageAccess('pages/secret.html', '');
    expect(result).toEqual({ allowed: false, reason: 'wrong-password' });
  });

  it('目录 public=false 且 password 已设 + queryPwd 超过 128 字符 → wrong-password', async () => {
    mocks.getDb.mockImplementation(() =>
      makeDbWithFolder({ path: 'pages', public: false, password: 'short' })
    );
    const { checkPageAccess } = await import('@/lib/storage/acl');
    const result = await checkPageAccess('pages/secret.html', 'a'.repeat(129));
    expect(result).toEqual({ allowed: false, reason: 'wrong-password' });
  });

  it('嵌套目录 + 父目录配置生效', async () => {
    // 文件路径 'pages/private/notes.html' → splitDirFilename.dir = 'pages/private'
    // mock 让 'pages/private' 命中带密码的记录
    mocks.findUnique.mockImplementation(({ where }: { where: { path: string } }) => {
      if (where.path === 'pages/private') {
        return Promise.resolve({
          path: 'pages/private',
          public: false,
          password: 'nested-pwd',
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      return Promise.resolve(null);
    });
    mocks.getDb.mockImplementation(
      () =>
        ({
          prisma: { storageFolder: { findUnique: mocks.findUnique } },
        }) as unknown as IDatabase
    );
    const { checkPageAccess } = await import('@/lib/storage/acl');

    const wrong = await checkPageAccess('pages/private/notes.html', 'wrong');
    expect(wrong).toEqual({ allowed: false, reason: 'wrong-password' });

    const right = await checkPageAccess('pages/private/notes.html', 'nested-pwd');
    expect(right).toEqual({ allowed: true, reason: 'public' });
  });
});

describe('normalizePath / getTopLevelFolder (纯函数)', () => {
  it('normalizePath 去除前导/尾随斜杠', async () => {
    const { normalizePath } = await import('@/lib/storage/acl');
    expect(normalizePath('/a/b/')).toBe('a/b');
    expect(normalizePath('a/b')).toBe('a/b');
    expect(normalizePath('')).toBe('');
    expect(normalizePath('///')).toBe('');
    expect(normalizePath('\\a\\b\\')).toBe('a\\b');
  });

  it('getTopLevelFolder 提取顶层', async () => {
    const { getTopLevelFolder } = await import('@/lib/storage/acl');
    expect(getTopLevelFolder('covers/2024/img.png')).toBe('covers');
    expect(getTopLevelFolder('img.png')).toBe('');
    expect(getTopLevelFolder('')).toBe('');
    expect(getTopLevelFolder('/a/b')).toBe('a');
  });
});
