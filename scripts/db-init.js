/**
 * 数据库初始化脚本
 * 在构建前运行，用于自动建表和数据迁移
 */

const { initializeDatabase } = require('./db-init');

async function main() {
  console.log('[数据库初始化] 开始数据库初始化...');
  
  try {
    // 检查是否有 DATABASE_URL
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.log('[数据库初始化] 未找到 DATABASE_URL，跳过数据库初始化');
      console.log('[数据库初始化] 提示：设置 DATABASE_URL 环境变量以启用自动建表功能');
      return;
    }
    
    // 检查数据库类型
    if (databaseUrl.startsWith('redis:')) {
      console.log('[数据库初始化] 使用 Redis，跳过建表操作');
      console.log('[数据库初始化] Redis 不需要表结构迁移');
      return;
    }
    
    // TODO: 实现 MySQL/PostgreSQL 自动建表
    // await initializeDatabase();
    
    console.log('[数据库初始化] 数据库初始化检查完成');
    console.log('[数据库初始化] 自动建表功能正在开发中');
    console.log('[数据库初始化] 详见 lib/db-init.ts 了解实现细节');
    
  } catch (error) {
    console.error('[数据库初始化] 错误:', error.message);
    console.log('[数据库初始化] 继续构建，不执行数据库初始化...');
  }
}

main();
