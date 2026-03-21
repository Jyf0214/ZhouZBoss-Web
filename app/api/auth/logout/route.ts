import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';

/**
 * User Logout API
 */

export async function POST() {
  await deleteSession();
  return NextResponse.json({ success: true });
}
