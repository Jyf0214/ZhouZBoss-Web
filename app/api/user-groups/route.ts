import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

// 默认用户组
const defaultGroups = [
  { id: 'sudo', name: '超级管理员组', description: '拥有所有权限的管理员组', isDefault: true },
  { id: 'admin', name: '管理员组', description: '普通管理员组', isDefault: true },
  { id: 'default', name: '默认用户组', description: '普通用户默认组', isDefault: true },
];

// 获取用户组列表
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const db = getDb();
    const groupsStr = await db.get('user-groups:list');
    
    let groups = groupsStr ? JSON.parse(groupsStr) : [];
    
    // 确保默认用户组存在
    const existingIds = groups.map((g: any) => g.id);
    for (const defaultGroup of defaultGroups) {
      if (!existingIds.includes(defaultGroup.id)) {
        groups.push(defaultGroup);
      }
    }
    
    return NextResponse.json(groups);
  } catch (error: any) {
    return NextResponse.json({ error: '获取用户组失败' }, { status: 500 });
  }
}

// 创建用户组（仅管理员）
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const { id, name, description } = await req.json();
    
    if (!name) {
      return NextResponse.json({ error: '用户组名称不能为空' }, { status: 400 });
    }
    
    // 不允许创建系统默认组
    if (['sudo', 'admin', 'default'].includes(id)) {
      return NextResponse.json({ error: '不能创建系统默认用户组' }, { status: 403 });
    }

    const db = getDb();
    const groupsStr = await db.get('user-groups:list');
    let groups = groupsStr ? JSON.parse(groupsStr) : [];
    
    // 确保默认用户组存在
    const existingIds = groups.map((g: any) => g.id);
    for (const defaultGroup of defaultGroups) {
      if (!existingIds.includes(defaultGroup.id)) {
        groups.push(defaultGroup);
      }
    }
    
    // 检查是否已存在
    if (groups.some((g: any) => g.id === id || g.name === name)) {
      return NextResponse.json({ error: '用户组ID或名称已存在' }, { status: 409 });
    }
    
    const newGroup = {
      id: id || `group-${Date.now().toString(36)}`,
      name,
      description: description || '',
      isDefault: false,
      createdAt: new Date().toISOString(),
    };
    
    groups.push(newGroup);
    await db.set('user-groups:list', JSON.stringify(groups));
    
    return NextResponse.json({ success: true, group: newGroup });
  } catch (error: any) {
    return NextResponse.json({ error: '创建用户组失败' }, { status: 500 });
  }
}

// 删除用户组（仅管理员）
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const { id } = await req.json();
    
    // 不允许删除系统默认组
    if (['sudo', 'admin', 'default'].includes(id)) {
      return NextResponse.json({ error: '不能删除系统默认用户组' }, { status: 403 });
    }

    const db = getDb();
    const groupsStr = await db.get('user-groups:list');
    const groups = groupsStr ? JSON.parse(groupsStr) : [];
    
    const filtered = groups.filter((g: any) => g.id !== id);
    await db.set('user-groups:list', JSON.stringify(filtered));
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: '删除用户组失败' }, { status: 500 });
  }
}
