// 屏蔽 Prisma 广告
process.env.PRISMA_HIDE_PREVIEW_FLAG_WARNINGS = 'true'
process.env.PRISMA_HIDE_UPDATE_MESSAGE = 'true'

// 密码哈希函数（与登录/注册保持一致）
function hashPassword(password) {
  return Buffer.from(password).toString('hex').split('').reverse().join('')
}

async function main() {
  // 检查数据库 URL
  const databaseUrl = 
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;
  
  if (!databaseUrl) {
    console.log('[数据库初始化] 未找到数据库 URL，跳过初始化');
    return;
  }
  
  // 自动添加 sslmode=require（如果没有）
  let finalUrl = databaseUrl
  if (databaseUrl.startsWith('postgres') && !databaseUrl.includes('sslmode')) {
    const separator = databaseUrl.includes('?') ? '&' : '?'
    finalUrl = `${databaseUrl}${separator}sslmode=require&ssl=true`
  }
  
  // 设置 DATABASE_URL 供 Prisma 使用
  process.env.DATABASE_URL = finalUrl
  
  console.log('[数据库初始化] 开始初始化...')
  
  const { execSync } = require('child_process')
  
  try {
    // 1. 推送 schema
    execSync('npx prisma db push --accept-data-loss', {
      stdio: 'inherit',
      env: { ...process.env }
    })
    
    console.log('[数据库初始化] ✓ Schema 推送成功')
    
    // 2. 迁移明文密码到哈希
    console.log('[数据库初始化] 检查明文密码...')
    
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    // 获取所有 KV 记录中以 user:uid: 开头的记录
    const userRecords = await prisma.originiumKV.findMany({
      where: {
        key: { startsWith: 'user:uid:' }
      }
    })
    
    let migratedCount = 0
    
    for (const record of userRecords) {
      if (!record.value) continue
      
      try {
        const user = JSON.parse(record.value)
        
        // 检查密码是否已经是哈希格式（64位十六进制）
        if (user.password && !/^[0-9a-f]{64}$/i.test(user.password)) {
          // 这是明文密码，需要哈希
          const hashedPassword = hashPassword(user.password)
          user.password = hashedPassword
          
          await prisma.originiumKV.update({
            where: { key: record.key },
            data: { value: JSON.stringify(user) }
          })
          
          migratedCount++
          console.log(`[数据库初始化] 已迁移用户: ${user.email}`)
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
    
    await prisma.$disconnect()
    
    if (migratedCount > 0) {
      console.log(`[数据库初始化] ✓ 已迁移 ${migratedCount} 个用户密码`)
    } else {
      console.log('[数据库初始化] ✓ 无需迁移密码')
    }
    
    console.log('[数据库初始化] ✓ 全部完成')
  } catch (error) {
    console.error('[数据库初始化] ❌ 失败:', error.message)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('[数据库初始化] ❌ 错误:', error)
  process.exit(1)
})
