// 屏蔽 Prisma 广告
process.env.PRISMA_HIDE_PREVIEW_FLAG_WARNINGS = 'true'
process.env.PRISMA_HIDE_UPDATE_MESSAGE = 'true'

const crypto = require('crypto');
const ITERATIONS = 100000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  // 检查数据库 URL
  const databaseUrl = 
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;
  
  if (!databaseUrl) {
  // eslint-disable-next-line no-console
    console.log('[数据库初始化] 未找到数据库 URL，跳过初始化');
    return;
  }
  
  // 检查是否跳过数据库初始化（环境变量控制）
  if (process.env.SKIP_DB_INIT === 'true') {
  // eslint-disable-next-line no-console
    console.log('[数据库初始化] SKIP_DB_INIT=true，跳过初始化');
    return;
  }
  
  // 自动添加 sslmode=require
  let finalUrl = databaseUrl
  if (databaseUrl.startsWith('postgres') && !databaseUrl.includes('sslmode')) {
    const separator = databaseUrl.includes('?') ? '&' : '?'
    finalUrl = `${databaseUrl}${separator}sslmode=require&ssl=true`
  }
  
  process.env.DATABASE_URL = finalUrl
  
  // eslint-disable-next-line no-console
  console.log('[数据库初始化] 开始初始化...')
  
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { execSync } = require('child_process')
  
  try {
    // 尝试推送 schema，如果失败则跳过
    try {
      execSync('npx prisma db push --accept-data-loss', {
        stdio: 'pipe',
        env: { ...process.env },
        timeout: 30000
      })
  // eslint-disable-next-line no-console
      console.log('[数据库初始化] ✓ Schema 推送成功')
    } catch (dbError) {
      const errorMsg = dbError.message || ''
      if (errorMsg.includes('MaxClientsInSessionMode') || 
          errorMsg.includes('max clients reached') ||
          errorMsg.includes('too many clients') ||
          errorMsg.includes('connection pool')) {
  // eslint-disable-next-line no-console
        console.log('[数据库初始化] ⚠️ 数据库连接池已满，跳过初始化')
        return
      }
  // eslint-disable-next-line no-console
      console.log('[数据库初始化] ⚠️ 数据库连接失败，跳过初始化:', errorMsg.split('\n')[0])
      return
    }
    
    try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()
      
      const users = await prisma.originiumKV.findMany({
        where: { key: { startsWith: 'user:uid:' } }
      })
      
      let hasAdmin = false
      let updatedCount = 0
      
      for (const record of users) {
        if (!record.value) continue
        
        try {
          const user = JSON.parse(record.value)
          
          if (user.role === 'admin' || user.role === 'sudo') {
            hasAdmin = true
            
            // 检查 ADMIN_PASSWORD 环境变量并更新
            if (process.env.ADMIN_PASSWORD) {
              const hashedPassword = hashPassword(process.env.ADMIN_PASSWORD)
              user.password = hashedPassword
              await prisma.originiumKV.update({
                where: { key: record.key },
                data: { value: JSON.stringify(user) }
              })
              updatedCount++
  // eslint-disable-next-line no-console
              console.log(`[数据库初始化] ✓ 已更新用户密码: ${user.email || user.username || user.uid}`)
            }
          }
	} catch (e) {
			console.error('用户数据解析失败:', record.key, e.message);
		}
      }
      
      if (!hasAdmin) {
  // eslint-disable-next-line no-console
        console.log('[数据库初始化] ⚠️ 系统内未检测到任何管理员账户。');
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        
        if (!adminEmail || !adminPassword) {
   
          console.error("❌ 致命错误：系统内没有任何管理员账户，且未提供 ADMIN_EMAIL 和 ADMIN_PASSWORD！");
   
          console.error("请配置 ADMIN_EMAIL 和 ADMIN_PASSWORD 环境变量来初始化管理员账户！");
          process.exit(1);
        }
        
  // eslint-disable-next-line no-console
        console.log(`[数据库初始化] 正在根据环境变量创建初始管理员: ${adminEmail}...`);
        const hashedPassword = hashPassword(adminPassword);
        const uid = crypto.randomUUID();
        const now = new Date().toISOString();
        const newAdmin = {
          uid,
          email: adminEmail,
          password: hashedPassword,
          role: 'sudo', // 最高权限
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
        
  // eslint-disable-next-line no-console
        console.log("[数据库初始化] ✓ 初始管理员创建成功");
      } else if (process.env.ADMIN_PASSWORD) {
        if (updatedCount > 0) {
  // eslint-disable-next-line no-console
          console.log(`[数据库初始化] ✓ 已更新 ${updatedCount} 个管理员配置密码`)
        }
      }
      
      await prisma.$disconnect()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('[数据库初始化] ⚠️ 初始管理员流程失败:', err.message?.split('\n')[0])
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()

      // 检查并删除 GitHub 同步成功标志
      const syncFlag = await prisma.originiumKV.findUnique({
        where: { key: 'github:sync:success' }
      })

      if (syncFlag) {
        await prisma.originiumKV.delete({
          where: { key: 'github:sync:success' }
        })
        // eslint-disable-next-line no-console
        console.log('[数据库初始化] ✓ 已删除 GitHub 同步成功标志')
      }

      await prisma.$disconnect()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('[数据库初始化] ⚠️ 删除同步标志失败:', err.message?.split('\n')[0])
    }

    // eslint-disable-next-line no-console
    console.log('[数据库初始化] ✓ 全部完成')
  } catch (error) {
  // eslint-disable-next-line no-console
    console.log('[数据库初始化] ⚠️ 初始化跳过:', error.message?.split('\n')[0])
  }
}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
main().catch((error) => {
  // eslint-disable-next-line no-console
  console.log('[数据库初始化] ⚠️ 错误跳过')
})
