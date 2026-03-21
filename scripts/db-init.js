/**
 * 数据库初始化脚本
 * 在构建前运行，用于自动建表和数据迁移
 */

async function main() {
  console.log('='.repeat(60));
  console.log('[数据库初始化] 开始数据库初始化...');
  console.log('='.repeat(60));
  
  try {
    // 检查是否有 DATABASE_URL
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.log('[数据库初始化] 未找到 DATABASE_URL，跳过数据库初始化');
      console.log('[数据库初始化] 提示：设置 DATABASE_URL 环境变量以启用自动建表功能');
      console.log('[数据库初始化] 使用 Redis 模式：redis://localhost:6379');
      return;
    }
    
    console.log(`[数据库初始化] 检测到数据库 URL: ${databaseUrl.split('://')[0]}://***`);
    
    // 检查数据库类型
    if (databaseUrl.startsWith('redis:')) {
      console.log('[数据库初始化] 使用 Redis，跳过建表操作');
      console.log('[数据库初始化] Redis 不需要表结构迁移');
      console.log('[数据库初始化] ✓ Redis 初始化完成');
      return;
    }
    
    // MySQL/PostgreSQL 自动建表
    console.log('[数据库初始化] 检测到 SQL 数据库，开始自动建表...');
    
    const { initializeDatabase } = require('./db-init-impl');
    await initializeDatabase();
    
    console.log('[数据库初始化] ✓ 数据库初始化完成');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('[数据库初始化] ❌ 错误:', error.message);
    console.error('[数据库初始化] 堆栈跟踪:', error.stack);
    console.log('[数据库初始化] 继续构建，不执行数据库初始化...');
    console.log('='.repeat(60));
  }
}

main();
