/**
 * 统一数据库接口 - 使用 Prisma
 * 支持 Supabase/PostgreSQL
 */
import { PrismaClient } from '../../prisma/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// 屏蔽 Prisma 广告
process.env.PRISMA_HIDE_PREVIEW_FLAG_WARNINGS = 'true'
process.env.PRISMA_HIDE_UPDATE_MESSAGE = 'true'

// 获取数据库 URL
function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL
}

/**
 * 检测数据库是否可用（至少配置了一个数据库 URL 环境变量）
 *
 * 统一入口：lib/config.ts 和其他模块均从此处引用，
 * 避免 lib/db.ts、lib/env.ts、lib/config.ts 三处重复实现。
 */
export function hasDatabase(): boolean {
  return !!getDatabaseUrl()
}

// 创建 Prisma 客户端单例

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | null | undefined
}

function createPrismaClient(): PrismaClient | null {
  const url = getDatabaseUrl()

  // 构建时可能没有 URL，返回 null
  if (!url) {
    return null
  }

  // 仅在未显式指定 sslmode 时添加 sslmode=no-verify：
  // SSL 加密仍启用，但跳过服务器证书验证。
  // 云数据库（Supabase/Neon 等）常使用自签名或自定义 CA 证书，
  // 构建环境（Vercel CI 等）的系统 CA 证书库可能不包含这些证书。
  // 用户显式配置的 sslmode（如 disable）必须被尊重，不得覆盖。
  //
  // 安全提示：no-verify 意味着不验证服务器身份，链路可被中间人截获。
  // 此兼容行为必须显式可见：注入时输出警告日志；
  // 生产环境如需完整证书校验，设置 DATABASE_SSL_STRICT=true
  // 并在连接串中提供 sslmode=verify-full 与 CA 证书。
  let finalUrl = url;
  const sslStrict = process.env.DATABASE_SSL_STRICT === 'true';
  if (url.startsWith('postgres') && !url.includes('sslmode=') && !sslStrict) {
    const separator = url.includes('?') ? '&' : '?';
    finalUrl = `${url}${separator}sslmode=no-verify`;
    console.warn('[db] DATABASE_URL 未指定 sslmode，已自动追加 sslmode=no-verify（加密但跳过服务器证书验证，用于兼容云数据库自签名 CA）。如需完整校验请设置 DATABASE_SSL_STRICT=true 并在连接串中配置 verify-full。');
  }

  const adapter = new PrismaPg({
    connectionString: finalUrl,
  })

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

// Prisma 7 强制要求 driver adapter，无 DATABASE_URL 时返回 null。
// 所有 API 路由均通过 hasDatabase() / getDb() 守卫，不会在 prisma=null 时访问。
export const prisma = (globalForPrisma.prisma ?? createPrismaClient()) as unknown as PrismaClient

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// 数据库接口定义
export interface IDatabase {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttl?: number): Promise<void>
  del(key: string): Promise<void>
  exists(key: string): Promise<boolean>
  hget(key: string, field: string): Promise<string | null>
  hset(key: string, field: string, value: string): Promise<void>
  hdel(key: string, field: string): Promise<void>
  hgetall(key: string): Promise<Record<string, string>>
  /**
   * Prisma 客户端直接访问入口。
   * 当数据库未配置(DATABASE_URL 等均未设置)时返回 null,
   * 调用方需自行降级处理(典型场景:视为「未配置」,跳过结构化数据访问)。
   */
  readonly prisma: PrismaClient | null
}

// Prisma 实现的数据库接口
class PrismaDriver implements IDatabase {
  /** 数据库未配置时为 null;调用方应将其视为「未配置」并降级处理 */
  public readonly prisma: PrismaClient | null = getDatabaseUrl() ? prisma : null

  /** 上次清理过期 KV 的时间戳（毫秒），用于节流 */
  private _lastCleanupTs = 0

  /**
   * 批量清理已过期的 KV 记录
   *
   * 每小时最多执行一次（节流），使用 deleteMany + expiry 索引高效删除。
   * 单次删除上限 500 条，避免长事务阻塞连接。
   * 异常静默吞掉——清理失败不应影响正常业务。
   */
  async cleanupExpiredKV(): Promise<void> {
    if (!this.prisma) return
    const now = Date.now()
    // 每小时最多清理一次
    if (now - this._lastCleanupTs < 60 * 60 * 1000) return
    this._lastCleanupTs = now
    try {
      const result = await this.prisma.originiumKV.deleteMany({
        where: {
          expiry: { not: null, lt: BigInt(now) },
        },
      })
      if (result.count > 0) {
        console.warn(`[db] KV 过期清理: 已删除 ${result.count} 条过期记录`)
      }
    } catch {
      // 清理失败不阻断业务
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.prisma) return null
    // 惰性触发过期清理（节流，不影响读取延迟）
    void this.cleanupExpiredKV()
    const record = await this.prisma.originiumKV.findUnique({ where: { key } })
    if (!record) return null
    if (record.expiry && record.expiry < BigInt(Date.now())) {
      await this.del(key)
      return null
    }
    return record.value
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.prisma) return
    const expiry = ttl && Number.isFinite(ttl) ? BigInt(Date.now() + ttl * 1000) : null
    await this.prisma.originiumKV.upsert({
      where: { key },
      update: { value, expiry },
      create: { key, value, expiry }
    })
  }

  async del(key: string): Promise<void> {
    if (!this.prisma) return
		await this.prisma.originiumKV.delete({ where: { key } }).catch((error) => { console.error('删除数据库记录失败:', key, error); })
  }

  async exists(key: string): Promise<boolean> {
    if (!this.prisma) return false
    const record = await this.prisma.originiumKV.findUnique({ where: { key } })
    // 检查过期时间，与 get() 保持一致
    return !!record && (!record.expiry || record.expiry >= BigInt(Date.now()))
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (!this.prisma) return null
    return this.get(`${key}:${field}`)
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    if (!this.prisma) return
    await this.set(`${key}:${field}`, value)
  }

  async hdel(key: string, field: string): Promise<void> {
    if (!this.prisma) return
    await this.del(`${key}:${field}`)
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.prisma) return {}
    // 惰性触发过期清理
    void this.cleanupExpiredKV()
    const records = await this.prisma.originiumKV.findMany({
      where: { key: { startsWith: `${key}:` } }
    })
    const result: Record<string, string> = {}
    const now = BigInt(Date.now())
    for (const record of records) {
      // 过滤已过期的 key，与 get() 保持一致
      if (record.expiry && record.expiry < now) continue
      if (record.value) {
        const field = record.key.substring(key.length + 1)
        result[field] = record.value
      }
    }
    return result
  }
}

// 获取数据库实例
let dbInstance: IDatabase | null = null

export function getDb(): IDatabase {
  dbInstance ??= new PrismaDriver()
  return dbInstance
}

export default prisma
