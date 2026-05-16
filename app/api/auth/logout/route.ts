import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/auth/logout');

/**
 * User Logout API
 */

export async function POST() {
  logger.info('POST', '用户登出');
  await deleteSession();
  return NextResponse.json({ success: true });
}
