/**
 * 数据库初始化脚本
 *
 * 安全策略（2026-06 修订）：
 * - `prisma db push` 不再默认执行。Build 链不应静默接受数据丢失。
 * - 仅当同时满足以下两个条件时才执行 Schema 推送：
 *     1. process.env.SKIP_DB_INIT !== '1'（未被全局跳过）
 *     2. process.env.ALLOW_DB_PUSH === '1'（开发者显式同意）
 * - 默认行为：打印 "db push skipped — set ALLOW_DB_PUSH=1 to opt in" 后继续执行种子/管理员初始化。
 * - 推荐用法：本地/CI 显式使用 `npm run db:push:safe` 触发 Schema 推送。
 */
// 屏蔽 Prisma 广告
process.env.PRISMA_HIDE_PREVIEW_FLAG_WARNINGS = 'true'
process.env.PRISMA_HIDE_UPDATE_MESSAGE = 'true'

import crypto from 'crypto';

function hashPassword(password, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  return hmac.update(password).digest('hex');
}

function isLegacyPassword(password) {
  return password && password.includes(':') && password.split(':').length === 2;
}

async function main() {
  const databaseUrl = 
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;
  
  if (process.env.SKIP_DB_INIT === 'true') {
    console.log('[数据库初始化] SKIP_DB_INIT=true，跳过初始化');
    return;
  }

  const { execSync } = await import('child_process')
  
  if (databaseUrl) {
    let finalUrl = databaseUrl
    if (databaseUrl.startsWith('postgres') && !databaseUrl.includes('sslmode')) {
      const separator = databaseUrl.includes('?') ? '&' : '?'
      finalUrl = `${databaseUrl}${separator}sslmode=require&ssl=true`
    }
    process.env.DATABASE_URL = finalUrl

    // 安全护栏：db push 默认跳过，仅在显式 ALLOW_DB_PUSH=1 且未被 SKIP_DB_INIT=1 时执行
    if (process.env.SKIP_DB_INIT !== '1' && process.env.ALLOW_DB_PUSH === '1') {
      console.log('[数据库初始化] 开始 Schema 推送...')

      try {
        execSync('npx prisma db push', {
          stdio: 'pipe',
          env: { ...process.env },
          timeout: 30000
        })
        console.log('[数据库初始化] ✓ Schema 推送成功')
      } catch (dbError) {
        const errorMsg = dbError.message || ''
        if (errorMsg.includes('MaxClientsInSessionMode') ||
            errorMsg.includes('max clients reached') ||
            errorMsg.includes('too many clients') ||
            errorMsg.includes('connection pool')) {
          console.log('[数据库初始化] ⚠️ 数据库连接池已满，跳过 Schema 推送')
        } else {
          console.log('[数据库初始化] ⚠️ Schema 推送失败:', errorMsg.split('\n')[0])
        }
        return
      }
    } else {
      console.log('[数据库初始化] db push skipped — set ALLOW_DB_PUSH=1 to opt in')
    }
  } else {
    console.log('[数据库初始化] 未找到数据库 URL，跳过 Schema 推送')
  }

  if (!databaseUrl) {
    console.log('[数据库初始化] 无数据库，跳过数据初始化')
    return
  }

  try {
    const authSecret = process.env.AUTH_SECRET;
    if (!authSecret) {
      console.error('[数据库初始化] 错误: AUTH_SECRET 环境变量未配置，无法初始化管理员密码');
      process.exit(1);
    }
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!adminPassword || !adminEmail) {
      console.log('[数据库初始化] ⚠️ 未配置 ADMIN_EMAIL 或 ADMIN_PASSWORD，跳过初始化');
      return;
    }

    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    const users = await prisma.originiumKV.findMany({
      where: { key: { startsWith: 'user:uid:' } }
    })

    const newHash = hashPassword(adminPassword, authSecret);
    let updatedCount = 0;
    let createdCount = 0;

    for (const record of users) {
      if (!record.value) continue

      try {
        const user = JSON.parse(record.value)

        if (user.role === 'admin' || user.role === 'sudo') {
          if (isLegacyPassword(user.password)) {
            user.password = newHash;
            await prisma.originiumKV.update({
              where: { key: record.key },
              data: { value: JSON.stringify(user) }
            });
            updatedCount++;
            console.log(`[数据库初始化] ✓ 迁移旧版用户密码: ${user.email || user.username || user.uid}`);
          } else if (adminPassword) {
            user.password = newHash;
            await prisma.originiumKV.update({
              where: { key: record.key },
              data: { value: JSON.stringify(user) }
            });
            updatedCount++;
            console.log(`[数据库初始化] ✓ 更新用户密码: ${user.email || user.username || user.uid}`);
          }
        }
      } catch (e) {
        console.error('用户数据处理失败:', record.key, e.message);
      }
    }

    const existingUid = await prisma.originiumKV.findUnique({
      where: { key: `user:email:${adminEmail}` }
    });

    if (!existingUid) {
      const uid = crypto.randomUUID();
      const now = new Date().toISOString();
      const newAdmin = {
        uid,
        email: adminEmail,
        username: adminEmail.split('@')[0],
        password: newHash,
        role: 'sudo',
        createdAt: now,
        updatedAt: now,
      };

      await prisma.originiumKV.upsert({
        where: { key: `user:uid:${uid}` },
        update: { value: JSON.stringify(newAdmin) },
        create: { key: `user:uid:${uid}`, value: JSON.stringify(newAdmin) },
      });

      await prisma.originiumKV.upsert({
        where: { key: `user:email:${adminEmail}` },
        update: { value: uid },
        create: { key: `user:email:${adminEmail}`, value: uid },
      });

      await prisma.originiumKV.upsert({
        where: { key: `user:username:${adminEmail.split('@')[0]}` },
        update: { value: uid },
        create: { key: `user:username:${adminEmail.split('@')[0]}`, value: uid },
      });

      createdCount++;
      console.log(`[数据库初始化] ✓ 创建新管理员: ${adminEmail}`);
    }

    if (updatedCount > 0) {
      console.log(`[数据库初始化] ✓ 已更新 ${updatedCount} 个用户密码`);
    }
    if (createdCount > 0) {
      console.log(`[数据库初始化] ✓ 已创建 ${createdCount} 个新管理员`);
    }

    await prisma.$disconnect()

    try {
      const syncFlag = await prisma.originiumKV.findUnique({
        where: { key: 'github:sync:success' }
      })
      if (syncFlag) {
        await prisma.originiumKV.delete({
          where: { key: 'github:sync:success' }
        })
        console.log('[数据库初始化] ✓ 已删除 GitHub 同步成功标志')
      }
    } catch (err) {
      console.log('[数据库初始化] ⚠️ 删除同步标志失败:', err.message?.split('\n')[0])
    }

    console.log('[数据库初始化] ✓ 全部完成')
  } catch (error) {
    console.log('[数据库初始化] ⚠️ 初始化跳过:', error.message?.split('\n')[0])
  }
}

main().catch(() => {
  console.log('[数据库初始化] ⚠️ 错误跳过')
})
