/**
 * 草稿存储模块
 * 优先使用数据库 KV 持久化，降级到本地文件系统（仅开发环境）
 */
import * as fs from 'fs';
import * as path from 'path';
import { getDb } from '@/lib/db';

const DRAFTS_DIR = path.join(process.cwd(), 'data', 'drafts');

function ensureDraftsDir() {
  if (!fs.existsSync(DRAFTS_DIR)) {
    fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  }
}

export async function saveDraft(id: string, content: string): Promise<void> {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error('Invalid draft ID');
  }
  const db = getDb();
  if (db.prisma) {
    // 生产环境：写入数据库 KV 持久化存储
    await db.set(`draft:content:${id}`, content);
  } else {
    // 无数据库时降级到本地文件（仅开发环境）
    ensureDraftsDir();
    const filePath = path.join(DRAFTS_DIR, `${id}.md`);
    await fs.promises.writeFile(filePath, content, 'utf-8');
  }
}

export async function getDraft(id: string): Promise<string | null> {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error('Invalid draft ID');
  }
  const db = getDb();
  if (db.prisma) {
    return await db.get(`draft:content:${id}`);
  }
  const filePath = path.join(DRAFTS_DIR, `${id}.md`);
  try {
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export async function deleteDraft(id: string): Promise<void> {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error('Invalid draft ID');
  }
  const db = getDb();
  if (db.prisma) {
    await db.del(`draft:content:${id}`);
  } else {
    const filePath = path.join(DRAFTS_DIR, `${id}.md`);
    try {
      await fs.promises.unlink(filePath);
    } catch {
      // 文件不存在时忽略
    }
  }
}