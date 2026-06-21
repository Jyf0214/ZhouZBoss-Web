import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkPageAccess } from '@/lib/storage/acl';

export async function POST(req: NextRequest) {
  const { path, password } = await req.json();
  if (!path || !password) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  }

  const access = await checkPageAccess(path, password);
  if (!access.allowed) {
    return NextResponse.json({ error: '密码错误' }, { status: 403 });
  }

  // 设置 httpOnly cookie，有效期 1 小时
  const cookieStore = await cookies();
  const cookieName = `pwd_${Buffer.from(path).toString('base64url').slice(0, 32)}`;
  cookieStore.set(cookieName, password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 3600,
    path: '/',
  });

  return NextResponse.json({ ok: true });
}
