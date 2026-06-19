/**
 * 站点健康检查端点
 * GET /api/health → 公开访问，供 UptimeRobot 等监控工具轮询
 *
 * 检查项:
 * - database: Prisma 连通性（未配置则跳过）
 * - storage: 存储后端可达性（未配置则跳过）
 * - version: 站点版本信息
 */
import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { getDb } from '@/lib/db'
import { getStorageProvider, isStorageConfigured } from '@/lib/storage/storage-provider'

export const dynamic = 'force-dynamic'

/** 进程启动时间（模块加载时固定） */
const startTime = Date.now()

type CheckStatus = 'ok' | 'error' | 'skipped'

interface CheckResult {
  status: CheckStatus
  latencyMs?: number
  message?: string
}

interface HealthResponse {
  status: 'ok' | 'degraded' | 'down'
  timestamp: string
  checks: {
    database: CheckResult
    storage: CheckResult
    version: { version: string; generatedAt: string }
  }
  uptime: number
}

/** 读取构建时生成的版本信息 */
function readVersion(): { version: string; generatedAt: string } {
  try {
    const raw = readFileSync(join(process.cwd(), 'data', 'version.json'), 'utf-8')
    const data = JSON.parse(raw) as { major: string; minor: string; generatedAt: string }
    return { version: `${data.major}+${data.minor}`, generatedAt: data.generatedAt }
  } catch {
    return { version: 'unknown', generatedAt: '' }
  }
}

/** 检查数据库连通性 */
async function checkDatabase(): Promise<CheckResult> {
  const db = getDb()
  if (!db.prisma) {
    return { status: 'skipped', message: '数据库未配置' }
  }

  const start = Date.now()
  try {
    await db.prisma.$queryRaw`SELECT 1`
    return { status: 'ok', latencyMs: Date.now() - start }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { status: 'error', latencyMs: Date.now() - start, message: msg }
  }
}

/** 检查存储后端可达性 */
async function checkStorage(): Promise<CheckResult> {
  if (!isStorageConfigured()) {
    return { status: 'skipped', message: '存储后端未配置' }
  }

  const start = Date.now()
  try {
    const provider = await getStorageProvider()
    await provider.listDirectory('')
    return { status: 'ok', latencyMs: Date.now() - start }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { status: 'error', latencyMs: Date.now() - start, message: msg }
  }
}

export async function GET() {
  const [database, storage] = await Promise.all([checkDatabase(), checkStorage()])
  const version = readVersion()

  // 判定整体状态:
  // - 数据库 error → down（核心服务不可用）
  // - 存储 error 且数据库 ok → degraded（非关键服务异常）
  // - 全部 ok 或 skipped → ok
  let overallStatus: HealthResponse['status'] = 'ok'
  if (database.status === 'error') {
    overallStatus = 'down'
  } else if (storage.status === 'error') {
    overallStatus = 'degraded'
  }

  const statusCode = overallStatus === 'down' ? 503 : 200

  const body: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks: { database, storage, version },
    uptime: Math.floor((Date.now() - startTime) / 1000),
  }

  return NextResponse.json(body, { status: statusCode })
}
