import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

// 默认用户组
const defaultGroups = [
  { id: 'sudo', name: '超级管理员组', description: '拥有所有权限的管理员组', isDefault: true, createdAt: new Date(0).toISOString() },
  { id: 'admin', name: '管理员组', description: '普通管理员组', isDefault: true, createdAt: new Date(0).toISOString() },
  { id: 'default', name: '默认用户组', description: '普通用户默认组', isDefault: true, createdAt: new Date(0).toISOString() },
];

// 计算用户组的成员数量
async function calculateMemberCount(db: any, groupId: string): Promise<number> {
  const userListStr = await db.get('users:all:list');
  if (!userListStr) return 0;
  
  const uids = JSON.parse(userListStr);
  let count = 0;
  
  for (const uid of uids) {
    const userStr = await db.get(`user:uid:${uid}`);
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.userGroup === groupId) {
        count++;
      }
    }
  }
  
  return count;
}

// 获取用户组列表或单个用户组
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('id');
    
    const groupsStr = await db.get('user-groups:list');
    let groups = groupsStr ? JSON.parse(groupsStr) : [];
    
    // 确保默认用户组存在
    const existingIds = groups.map((g: any) => g.id);
    for (const defaultGroup of defaultGroups) {
      if (!existingIds.includes(defaultGroup.id)) {
        groups.push(defaultGroup);
      }
    }
    
    // 计算成员数量
    for (const group of groups) {
      group.memberCount = await calculateMemberCount(db, group.id);
    }
    
    // 如果指定了 id，返回单个用户组
    if (groupId) {
      const group = groups.find((g: any) => g.id === groupId);
      if (!group) {
        return NextResponse.json({ error: '用户组不存在' }, { status: 404 });
      }
      return NextResponse.json(group);
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
      createdBy: session.uid,
      memberCount: 0,
    };
    
    groups.push(newGroup);
    await db.set('user-groups:list', JSON.stringify(groups));
    
    return NextResponse.json({ success: true, group: newGroup });
  } catch (error: any) {
    return NextResponse.json({ error: '创建用户组失败' }, { status: 500 });
  }
}

// 更新用户组（仅管理员）
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const { id, name, description } = await req.json();
    
    if (!id) {
      return NextResponse.json({ error: '用户组ID不能为空' }, { status: 400 });
    }
    
    // 不允许修改系统默认组
    if (['sudo', 'admin', 'default'].includes(id)) {
      return NextResponse.json({ error: '不能修改系统默认用户组' }, { status: 403 });
    }
    
    if (!name && !description) {
      return NextResponse.json({ error: '需要提供要更新的字段' }, { status: 400 });
    }

    const db = getDb();
    const groupsStr = await db.get('user-groups:list');
    let groups = groupsStr ? JSON.parse(groupsStr) : [];
    
    const groupIndex = groups.findIndex((g: any) => g.id === id);
    if (groupIndex === -1) {
      return NextResponse.json({ error: '用户组不存在' }, { status: 404 });
    }
    
    // 只更新允许的字段
    if (name) {
      groups[groupIndex].name = name;
    }
    if (description !== undefined) {
      groups[groupIndex].description = description;
    }
    
    await db.set('user-groups:list', JSON.stringify(groups));
    
    return NextResponse.json({ success: true, group: groups[groupIndex] });
  } catch (error: any) {
    return NextResponse.json({ error: '更新用户组失败' }, { status: 500 });
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
