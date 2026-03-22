'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home, FileText, Plus, Settings, Users, Shield, Trash2,
  Activity, Menu, X, LogOut, BookOpen, UserCog
} from 'lucide-react';
import { Icon, Text } from '@lobehub/ui';

interface MenuItem {
  label: string;
  icon: any;
  href: string;
  adminOnly?: boolean;
}

const menuItems: MenuItem[] = [
  { label: '控制台', icon: Home, href: '/dashboard' },
  { label: '写文章', icon: Plus, href: '/editor' },
  { label: '文章管理', icon: BookOpen, href: '/dashboard/articles' },
  { label: '回收站', icon: Trash2, href: '/dashboard/articles?status=pending_deletion' },
];

const adminItems: MenuItem[] = [
  { label: '用户管理', icon: UserCog, href: '/admin/users', adminOnly: true },
  { label: '用户组', icon: Shield, href: '/admin/groups', adminOnly: true },
  { label: '系统配置', icon: Settings, href: '/admin/config', adminOnly: true },
  { label: '环境变量', icon: Activity, href: '/admin/env', adminOnly: true },
  { label: '工单管理', icon: FileText, href: '/admin/tickets', adminOnly: true },
];

export default function Sidebar() {
  const { user, isSudo, logout } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const allItems = isSudo ? [...menuItems, ...adminItems] : menuItems;

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href.split('?')[0]);
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  // 侧边栏内容
  const SidebarContent = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--ant-color-bg-container)',
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid var(--ant-color-border-secondary)',
      }}>
        <Text fontSize={18} weight={'bold'}>Originium Kernel</Text>
      </div>

      {/* 菜单 */}
      <div style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {allItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsOpen(false)}
            style={{ textDecoration: 'none' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 8,
                marginBottom: 4,
                background: isActive(item.href) ? 'var(--ant-color-primary-bg)' : 'transparent',
                color: isActive(item.href) ? 'var(--ant-color-primary)' : 'var(--ant-color-text)',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.href)) {
                  e.currentTarget.style.background = 'var(--ant-color-bg-layout)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.href)) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <Icon icon={item.icon} />
              <Text style={{ 
                color: isActive(item.href) ? 'var(--ant-color-primary)' : 'inherit',
                fontWeight: isActive(item.href) ? 500 : 400,
              }}>
                {item.label}
              </Text>
            </div>
          </Link>
        ))}
      </div>

      {/* 用户信息 */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid var(--ant-color-border-secondary)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <Text weight={500}>{user?.name || '用户'}</Text>
            <Text fontSize={12} type="secondary" style={{ display: 'block' }}>
              {user?.email}
            </Text>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              borderRadius: 8,
              color: 'var(--ant-color-text-secondary)',
            }}
            title="退出登录"
          >
            <Icon icon={LogOut} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 移动端菜单按钮 */}
      <button
        onClick={() => setIsOpen(true)}
        className="mobile-menu-btn"
        style={{
          display: 'none',
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 1000,
          background: 'var(--ant-color-bg-container)',
          border: '1px solid var(--ant-color-border)',
          borderRadius: 8,
          padding: 10,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <Icon icon={Menu} />
      </button>

      {/* PC端侧边栏 */}
      <div
        className="pc-sidebar"
        style={{
          width: 240,
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          borderRight: '1px solid var(--ant-color-border-secondary)',
          zIndex: 100,
        }}
      >
        <SidebarContent />
      </div>

      {/* 移动端遮罩 */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 998,
          }}
        />
      )}

      {/* 移动端侧边栏 */}
      <div
        className="mobile-sidebar"
        style={{
          position: 'fixed',
          top: 0,
          left: isOpen ? 0 : -280,
          width: 280,
          height: '100vh',
          zIndex: 999,
          transition: 'left 0.3s ease',
          boxShadow: isOpen ? '4px 0 12px rgba(0,0,0,0.1)' : 'none',
        }}
      >
        <SidebarContent />
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .pc-sidebar {
            display: none !important;
          }
          .mobile-menu-btn {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-sidebar {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
