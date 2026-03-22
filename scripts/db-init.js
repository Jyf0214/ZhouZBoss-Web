// 屏蔽 Prisma 广告
process.env.PRISMA_HIDE_PREVIEW_FLAG_WARNINGS = 'true'
process.env.PRISMA_HIDE_UPDATE_MESSAGE = 'true'

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
    execSync('npx prisma db push --accept-data-loss', {
      stdio: 'inherit',
      env: { ...process.env }
    })
    
    console.log('[数据库初始化] ✓ 成功')
  } catch (error) {
    console.error('[数据库初始化] ❌ 失败:', error.message)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('[数据库初始化] ❌ 错误:', error)
  process.exit(1)
})
