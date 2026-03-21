/**
 * 数据库初始化脚本
 * 在构建前运行，用于自动建表和数据迁移
 */

// MySQL 建表语句生成
function generateCreateTableMySQL(schema) {
  const columns = schema.columns.map(col => {
    let type = 'VARCHAR(255)';
    switch (col.type) {
      case 'text': type = 'TEXT'; break;
      case 'integer': type = 'INT'; break;
      case 'bigint': type = 'BIGINT'; break;
      case 'timestamp': type = 'TIMESTAMP'; break;
      case 'boolean': type = 'TINYINT(1)'; break;
      case 'json': type = 'JSON'; break;
    }
    
    const nullable = col.nullable ? 'NULL' : 'NOT NULL';
    const primary = col.primary ? 'PRIMARY KEY' : '';
    const defaultVal = col.default ? `DEFAULT ${col.default}` : '';
    
    return `  \`${col.name}\` ${type} ${nullable} ${primary} ${defaultVal}`.trim();
  });
  
  const indexes = (schema.indexes || []).map(idx => {
    const unique = idx.unique ? 'UNIQUE' : '';
    const cols = idx.columns.map(c => `\`${c}\``).join(', ');
    return `  ${unique} INDEX \`${idx.name}\` (${cols})`;
  });
  
  return `CREATE TABLE IF NOT EXISTS \`${schema.name}\` (\n${[...columns, ...indexes].join(',\n')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
}

// PostgreSQL 建表语句生成
function generateCreateTablePostgres(schema) {
  const columns = schema.columns.map(col => {
    let type = 'VARCHAR(255)';
    switch (col.type) {
      case 'text': type = 'TEXT'; break;
      case 'integer': type = 'INTEGER'; break;
      case 'bigint': type = 'BIGINT'; break;
      case 'timestamp': type = 'TIMESTAMP'; break;
      case 'boolean': type = 'BOOLEAN'; break;
      case 'json': type = 'JSONB'; break;
    }
    
    const nullable = col.nullable ? 'NULL' : 'NOT NULL';
    const primary = col.primary ? 'PRIMARY KEY' : '';
    const defaultVal = col.default ? `DEFAULT ${col.default}` : '';
    
    return `  "${col.name}" ${type} ${nullable} ${primary} ${defaultVal}`.trim();
  });
  
  const indexes = (schema.indexes || []).map(idx => {
    const unique = idx.unique ? 'UNIQUE' : '';
    const cols = idx.columns.map(c => `"${c}"`).join(', ');
    return `CREATE ${unique} INDEX IF NOT EXISTS "${idx.name}" ON "${schema.name}" (${cols});`;
  });
  
  const createTable = `CREATE TABLE IF NOT EXISTS "${schema.name}" (\n${columns.join(',\n')}\n);`;
  return [createTable, ...indexes].join('\n');
}

// 表结构定义
const USERS_TABLE = {
  name: 'users',
  columns: [
    { name: 'uid', type: 'varchar', primary: true },
    { name: 'email', type: 'varchar', nullable: false },
    { name: 'name', type: 'varchar', nullable: false },
    { name: 'password', type: 'varchar', nullable: false },
    { name: 'role', type: 'varchar', default: "'user'" },
    { name: 'user_group', type: 'varchar', nullable: true },
    { name: 'status', type: 'varchar', default: "'active'" },
    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
    { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
  ],
  indexes: [
    { name: 'idx_email', columns: ['email'], unique: true },
    { name: 'idx_uid', columns: ['uid'], unique: true },
  ],
};

const KV_TABLE = {
  name: 'originium_kv',
  columns: [
    { name: 'k', type: 'varchar', primary: true },
    { name: 'v', type: 'text', nullable: true },
    { name: 'expiry', type: 'bigint', nullable: true },
    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
  ],
  indexes: [
    { name: 'idx_k', columns: ['k'], unique: true },
  ],
};

const SCHEMAS = [KV_TABLE, USERS_TABLE];

async function initializeDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.log('[数据库初始化] 未配置 DATABASE_URL，跳过初始化');
    return;
  }
  
  let connection;
  let sqlType;
  
  try {
    if (databaseUrl.startsWith('mysql:')) {
      sqlType = 'mysql';
      console.log('[数据库初始化] 正在连接 MySQL...');
      const mysql = require('mysql2/promise');
      connection = await mysql.createPool(databaseUrl);
      console.log('[数据库初始化] ✓ MySQL 连接成功');
    } else if (databaseUrl.startsWith('postgres:') || databaseUrl.startsWith('postgresql:')) {
      sqlType = 'postgres';
      console.log('[数据库初始化] 正在连接 PostgreSQL...');
      const { Client } = require('pg');
      connection = new Client({ connectionString: databaseUrl });
      await connection.connect();
      console.log('[数据库初始化] ✓ PostgreSQL 连接成功');
    } else {
      console.log('[数据库初始化] 非 SQL 数据库，跳过建表操作');
      return;
    }
    
    console.log('[数据库初始化] 开始创建表结构...');
    
    for (const schema of SCHEMAS) {
      console.log(`[数据库初始化] 创建表：${schema.name}`);
      
      try {
        if (sqlType === 'mysql') {
          const sql = generateCreateTableMySQL(schema);
          console.log(`[数据库初始化] SQL: ${sql.replace(/\n/g, ' ')}`);
          await connection.query(sql);
        } else if (sqlType === 'postgres') {
          const sql = generateCreateTablePostgres(schema);
          const statements = sql.split(';').filter(s => s.trim());
          for (const stmt of statements) {
            console.log(`[数据库初始化] SQL: ${stmt.trim()}`);
            await connection.query(stmt);
          }
        }
        console.log(`[数据库初始化] ✓ 表 ${schema.name} 创建成功`);
      } catch (error) {
        console.error(`[数据库初始化] ❌ 表 ${schema.name} 创建失败:`, error.message);
        throw error;
      }
    }
    
    console.log('[数据库初始化] ✓ 所有表创建完成');
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('[数据库初始化] 数据库连接已关闭');
    }
  }
}

module.exports = { initializeDatabase };
