import Redis from 'ioredis';
import mysql from 'mysql2/promise';
import { Client as PgClient } from 'pg';

/**
 * Originium Kernel Database Interface
 * Supports Redis, MySQL, and PostgreSQL via DATABASE_URL
 */

export type StorageEngine = 'redis' | 'mysql' | 'postgres';

interface IDatabase {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<void>;
  hdel(key: string, field: string): Promise<void>;
  hgetall(key: string): Promise<Record<string, string>>;
}

class RedisDriver implements IDatabase {
  private client: Redis;
  constructor(url: string) {
    console.log('[数据库] 正在初始化 Redis 连接...');
    this.client = new Redis(url, {
      maxRetriesPerRequest: 3, // 减少重试次数
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('[数据库] Redis 连接失败，已达到最大重试次数');
          return null; // 停止重试
        }
        return Math.min(times * 200, 2000);
      },
    });
    
    this.client.on('error', (err) => {
      console.error('[数据库] Redis 连接错误:', err.message);
    });
    
    this.client.on('connect', () => {
      console.log('[数据库] Redis 连接成功');
    });
  }
  async get(key: string) { return this.client.get(key); }
  async set(key: string, value: string, ttl?: number) {
    if (ttl) await this.client.set(key, value, 'EX', ttl);
    else await this.client.set(key, value);
  }
  async del(key: string) { await this.client.del(key); }
  async exists(key: string) { return (await this.client.exists(key)) === 1; }
  async hget(key: string, field: string) { return this.client.hget(key, field); }
  async hset(key: string, field: string, value: string) { await this.client.hset(key, field, value); }
  async hdel(key: string, field: string) { await this.client.hdel(key, field); }
  async hgetall(key: string) { return this.client.hgetall(key); }
}

// MySQL and Postgres drivers
class SqlDriver implements IDatabase {
  private type: 'mysql' | 'postgres';
  private pool: any;
  private tableName = 'originium_kv';
  
  constructor(type: 'mysql' | 'postgres', url: string) {
    this.type = type;
    if (type === 'mysql') {
      this.pool = mysql.createPool(url);
    } else {
      this.pool = new PgClient({ connectionString: url });
      (this.pool as PgClient).connect().catch(console.error);
    }
    this.initTable();
  }

  private async initTable() {
    const sql = this.type === 'mysql' 
      ? `CREATE TABLE IF NOT EXISTS ${this.tableName} (k VARCHAR(255) PRIMARY KEY, v LONGTEXT, expiry BIGINT)`
      : `CREATE TABLE IF NOT EXISTS ${this.tableName} (k VARCHAR(255) PRIMARY KEY, v TEXT, expiry BIGINT)`;
    await this.query(sql);
  }

  private async query(sql: string, params: any[] = []) {
    if (this.type === 'mysql') {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } else {
      const res = await (this.pool as PgClient).query(sql, params);
      return res.rows;
    }
  }

  async get(key: string): Promise<string | null> {
    const rows = await this.query(`SELECT v, expiry FROM ${this.tableName} WHERE k = ?`, [key]);
    if (!rows.length) return null;
    const { v, expiry } = rows[0];
    if (expiry && expiry < Date.now()) {
      await this.del(key);
      return null;
    }
    return v;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const expiry = ttl ? Date.now() + ttl * 1000 : null;
    if (this.type === 'mysql') {
      await this.query(`INSERT INTO ${this.tableName} (k, v, expiry) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v), expiry = VALUES(expiry)`, [key, value, expiry]);
    } else {
      await this.query(`INSERT INTO ${this.tableName} (k, v, expiry) VALUES ($1, $2, $3) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v, expiry = EXCLUDED.expiry`, [key, value, expiry]);
    }
  }

  async del(key: string): Promise<void> {
    await this.query(`DELETE FROM ${this.tableName} WHERE k = ?`, [key]);
  }

  async exists(key: string): Promise<boolean> {
    const rows = await this.query(`SELECT 1 FROM ${this.tableName} WHERE k = ?`, [key]);
    return rows.length > 0;
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.get(`${key}:${field}`);
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.set(`${key}:${field}`, value);
  }

  async hdel(key: string, field: string): Promise<void> {
    await this.del(`${key}:${field}`);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const prefix = `${key}:%`;
    const rows = await this.query(`SELECT k, v FROM ${this.tableName} WHERE k LIKE ?`, [prefix]);
    const result: Record<string, string> = {};
    for (const row of rows) {
      const field = row.k.substring(key.length + 1);
      result[field] = row.v;
    }
    return result;
  }
}

let dbInstance: IDatabase | null = null;

export function getDb(): IDatabase {
  if (dbInstance) return dbInstance;

  const url = process.env.DATABASE_URL || 'redis://localhost:6379';
  
  if (url.startsWith('redis:')) {
    dbInstance = new RedisDriver(url);
  } else if (url.startsWith('mysql:')) {
    dbInstance = new SqlDriver('mysql', url);
  } else if (url.startsWith('postgres:') || url.startsWith('postgresql:')) {
    dbInstance = new SqlDriver('postgres', url);
  } else {
    throw new Error('Unsupported DATABASE_URL protocol');
  }

  return dbInstance;
}

/**
 * Storage Helpers for Base64 and Indexing
 */
export const storage = {
  // Store file content as Base64 in Redis
  async saveFile(path: string, content: string) {
    const db = getDb();
    const base64 = Buffer.from(content).toString('base64');
    await db.set(`file:${path}`, base64);
  },

  async getFile(path: string): Promise<string | null> {
    const db = getDb();
    const base64 = await db.get(`file:${path}`);
    if (!base64) return null;
    return Buffer.from(base64, 'base64').toString('utf-8');
  },

  // Indexing articles for fast lookup
  async indexArticle(id: string, metadata: any) {
    const db = getDb();
    await db.hset('articles:index', id, JSON.stringify(metadata));
  }
};

/**
 * Database Backup System
 * Priority: config.yaml (GitHub) > Redis > Local DB
 */
export const backup = {
  // Backup config to Redis with timestamp
  async backupConfig(config: any) {
    const db = getDb();
    const timestamp = Date.now();
    const backupKey = `backup:config:${timestamp}`;
    await db.set(backupKey, JSON.stringify(config));
    
    // Keep only last 10 backups
    const backups = await db.hgetall('backup:config:list');
    const backupList = Object.keys(backups).map(k => parseInt(k)).sort((a, b) => b - a);
    backupList.push(timestamp);
    
    // Remove old backups beyond 10
    while (backupList.length > 10) {
      const oldest = backupList.pop();
      if (oldest) {
        await db.del(`backup:config:${oldest}`);
      }
    }
    
    await db.hset('backup:config:list', timestamp.toString(), '1');
  },

  // Restore config from Redis backup
  async restoreConfig(timestamp?: number): Promise<any | null> {
    const db = getDb();
    
    if (timestamp) {
      const backupStr = await db.get(`backup:config:${timestamp}`);
      if (backupStr) return JSON.parse(backupStr);
    }
    
    // Get latest backup
    const backups = await db.hgetall('backup:config:list');
    const backupList = Object.keys(backups).map(k => parseInt(k)).sort((a, b) => b - a);
    if (backupList.length > 0) {
      const latest = backupList[0];
      const backupStr = await db.get(`backup:config:${latest}`);
      if (backupStr) return JSON.parse(backupStr);
    }
    
    return null;
  },

  // Backup all user data
  async backupUsers() {
    const db = getDb();
    const timestamp = Date.now();
    const userList = await db.get('users:all:list');
    if (!userList) return;
    
    const users = JSON.parse(userList);
    const backupData: any[] = [];
    
    for (const uid of users) {
      const userStr = await db.get(`user:uid:${uid}`);
      if (userStr) {
        backupData.push(JSON.parse(userStr));
      }
    }
    
    await db.set(`backup:users:${timestamp}`, JSON.stringify(backupData));
    await db.hset('backup:users:list', timestamp.toString(), '1');
  },

  // Restore users from backup
  async restoreUsers(timestamp?: number): Promise<any[] | null> {
    const db = getDb();
    
    if (timestamp) {
      const backupStr = await db.get(`backup:users:${timestamp}`);
      if (backupStr) return JSON.parse(backupStr);
    }
    
    const backups = await db.hgetall('backup:users:list');
    const backupList = Object.keys(backups).map(k => parseInt(k)).sort((a, b) => b - a);
    if (backupList.length > 0) {
      const latest = backupList[0];
      const backupStr = await db.get(`backup:users:${latest}`);
      if (backupStr) return JSON.parse(backupStr);
    }
    
    return null;
  },

  // Backup articles
  async backupArticles() {
    const db = getDb();
    const timestamp = Date.now();
    const index = await db.hgetall('articles:index');
    
    const backupData: any[] = [];
    for (const [id, data] of Object.entries(index)) {
      const article = JSON.parse(data);
      const fullContent = await storage.getFile(`articles/${id}.md`);
      backupData.push({ ...article, fullContent });
    }
    
    await db.set(`backup:articles:${timestamp}`, JSON.stringify(backupData));
    await db.hset('backup:articles:list', timestamp.toString(), '1');
  },

  // Restore articles from backup
  async restoreArticles(timestamp?: number): Promise<any[] | null> {
    const db = getDb();
    
    if (timestamp) {
      const backupStr = await db.get(`backup:articles:${timestamp}`);
      if (backupStr) return JSON.parse(backupStr);
    }
    
    const backups = await db.hgetall('backup:articles:list');
    const backupList = Object.keys(backups).map(k => parseInt(k)).sort((a, b) => b - a);
    if (backupList.length > 0) {
      const latest = backupList[0];
      const backupStr = await db.get(`backup:articles:${latest}`);
      if (backupStr) return JSON.parse(backupStr);
    }
    
    return null;
  },

  // Create full system backup
  async fullBackup() {
    await Promise.all([
      this.backupConfig({}),
      this.backupUsers(),
      this.backupArticles(),
    ]);
  },
};
