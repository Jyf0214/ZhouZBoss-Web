/**
 * 数据库初始化脚本 (Prisma 版本)
 * 使用 Prisma 管理数据库
 * 
 * 规则：
 * - 未配置 DATABASE_URL：跳过，继续构建
 * - Redis：跳过，继续构建
 * - SQL 数据库：必须成功，否则构建失败
 */

// 屏蔽 Prisma 广告
process.env.PRISMA_HIDE_PREVIEW_FLAG_WARNINGS = 'true'
process.env.PRISMA_HIDE_UPDATE_MESSAGE = 'true'

async function main() {
  console.log('='.repeat(60));
  console.log('[数据库初始化] 开始数据库初始化...');
  console.log('='.repeat(60));
  
  // 检查是否有 DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.log('[数据库初始化] 未找到 DATABASE_URL，跳过数据库初始化');
    console.log('[数据库初始化] 提示：设置 DATABASE_URL 环境变量以启用数据库功能');
    console.log('='.repeat(60));
    return;
  }
  
  console.log(`[数据库初始化] 检测到数据库 URL: ${databaseUrl.split('://')[0]}://***`);
  
  // 检查数据库类型
  if (databaseUrl.startsWith('redis:')) {
    console.log('[数据库初始化] 使用 Redis，跳过 Prisma 操作');
    console.log('[数据库初始化] Redis 不需要表结构迁移');
    console.log('[数据库初始化] ✓ Redis 初始化完成');
    console.log('='.repeat(60));
    return;
  }
  
  // SQL 数据库必须初始化成功
  console.log('[数据库初始化] 检测到 SQL 数据库，使用 Prisma 推送 schema...');
  
  const { execSync } = require('child_process');
  
  try {
    // 运行 prisma db push
    execSync('npx prisma db push --accept-data-loss', {
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    console.log('[数据库初始化] ✓ 数据库 schema 推送成功');
    console.log('[数据库初始化] ✓ 数据库初始化完成');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('[数据库初始化] ❌ 数据库初始化失败:', error.message);
    console.error('[数据库初始化] 构建终止');
    console.log('='.repeat(60));
    process.exit(1);  // 非零退出码，构建失败
  }
}

main().catch((error) => {
  console.error('[数据库初始化] ❌ 未捕获错误:', error);
  process.exit(1);
});
