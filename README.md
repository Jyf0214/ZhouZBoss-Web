# Originium Kernel

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6.19-blue?style=flat-square&logo=prisma)
![License](https://img.shields.io/badge/License-Private-red?style=flat-square)

## 项目简介

Originium Kernel 是一个基于 Next.js 16 和 React 19 构建的现代化内容发布平台。它提供了完整的内容管理解决方案，包括文章发布、用户管理、权限控制等功能，适用于构建个人博客、技术文档站或企业内容管理系统。

## 核心特性

- **GitHub 自动同步** - 支持与 GitHub 仓库自动同步，轻松管理 Markdown 内容
- **RBAC 权限系统** - 基于角色的访问控制，支持管理员、编辑者、普通用户等多角色权限管理
- **密码重置（SMTP）** - 集成 SMTP 邮件服务，支持安全的密码重置流程
- **国际化支持** - 内置 i18n 多语言支持，轻松实现界面多语言切换
- **自定义背景主题** - 灵活的主题系统，支持自定义背景和界面风格

## 环境变量配置

复制 `.env.example` 为 `.env.local` 并配置以下变量：

| 变量名 | 必需 | 说明 | 示例值 |
|--------|------|------|--------|
| `DATABASE_URL` | ✅ | 数据库连接 URL | `redis://localhost:6379` |
| `AUTH_SECRET` | ✅ | 会话加密密钥 (≥32字符) | `openssl rand -base64 32` |
| `APP_URL` | ❌ | 应用 URL (用于回调) | `http://localhost:3000` |
| `GITHUB_REPO` | ❌ | GitHub 仓库地址 | `username/repo-name` |
| `GITHUB_TOKEN` | ❌ | GitHub 访问令牌 | `ghp_xxxxxxxxxxxx` |
| `CRON_SECRET` | ❌ | 定时任务密钥 | `your-cron-secret` |

**支持的数据库**：Redis / MySQL / PostgreSQL / Upstash Redis

## 快速开始

```bash
# 1. 克隆项目
git clone <repository-url>
cd ZhouZBoss-Web

# 2. 安装依赖
bun install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入实际配置

# 4. 初始化数据库
bun run db:push

# 5. 启动开发服务器
bun run dev
```

访问 http://localhost:3000 查看应用

## 项目结构

```
├── app/                    # Next.js App Router 页面
│   ├── api/               # API 路由
│   │   ├── admin/         # 管理员接口
│   │   ├── articles/      # 文章接口
│   │   ├── auth/          # 认证接口
│   │   ├── users/         # 用户接口
│   │   └── ...
│   ├── admin/             # 管理后台页面
│   ├── dashboard/         # 仪表盘页面
│   └── editor/            # 编辑器页面
├── components/            # React 组件
├── lib/                   # 工具库
│   ├── auth.ts           # 认证逻辑
│   ├── db.ts             # 数据库操作
│   ├── github.ts         # GitHub 集成
│   ├── mail.ts           # 邮件服务
│   └── prisma.ts         # Prisma 客户端
├── prisma/               # 数据库模型
├── i18n/                 # 国际化文件
├── scripts/              # 脚本工具
└── public/               # 静态资源
```

## API 接口

### 认证相关
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/logout` | 用户登出 |
| POST | `/api/auth/reset-password` | 重置密码 |

### 文章管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/articles` | 获取文章列表 |
| POST | `/api/articles` | 创建文章 |
| GET | `/api/articles/[id]` | 获取文章详情 |
| PUT | `/api/articles/[id]` | 更新文章 |
| DELETE | `/api/articles/[id]` | 删除文章 |

### 用户管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/users` | 获取用户列表 |
| GET | `/api/users/[id]` | 获取用户详情 |
| PUT | `/api/users/[id]` | 更新用户信息 |

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16, React 19 |
| 语言 | TypeScript 5.9 |
| 数据库 | Prisma ORM (支持 Redis/MySQL/PostgreSQL) |
| UI 库 | Ant Design 6, LobeHub UI, Tailwind CSS |
| 认证 | Jose (JWT) |
| 国际化 | next-intl |
| 邮件 | Nodemailer |
| GitHub | Octokit |
| 包管理 | Bun |

## 许可证

本项目为私有项目，未经授权不得复制、修改或分发。

---

**Originium Kernel** © 2026 ZhouZBoss. All Rights Reserved.
