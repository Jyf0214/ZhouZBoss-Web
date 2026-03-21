/**
 * 数据库初始化脚本
 * 在构建前运行，用于自动建表和数据迁移
 */

const { initializeDatabase } = require('./db-init');

async function main() {
  console.log('[DB Init] Starting database initialization...');
  
  try {
    // 检查是否有 DATABASE_URL
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.log('[DB Init] No DATABASE_URL found, skipping database initialization');
      console.log('[DB Init] Tip: Set DATABASE_URL environment variable to enable auto table creation');
      return;
    }
    
    // 检查数据库类型
    if (databaseUrl.startsWith('redis:')) {
      console.log('[DB Init] Using Redis, skipping table creation');
      console.log('[DB Init] Redis does not require schema migration');
      return;
    }
    
    // TODO: 实现 MySQL/PostgreSQL 自动建表
    // await initializeDatabase();
    
    console.log('[DB Init] Database initialization check completed');
    console.log('[DB Init] Auto table creation feature is under development');
    console.log('[DB Init] See lib/db-init.ts for implementation details');
    
  } catch (error) {
    console.error('[DB Init] Error:', error.message);
    console.log('[DB Init] Continuing build without database initialization...');
  }
}

main();
