# Originium Kernel

一个基于 Next.js 16 构建的现代内容发布平台，支持文章管理、GitHub 同步、用户系统等功能。

## 核心功能

- **用户认证系统** - 基于 JWT 的会话认证，支持邮箱/用户名登录
- **文章管理** - 创建、编辑、删除文章，支持 Markdown 格式
- **GitHub 同步** - 发布文章自动同步到 GitHub 仓库，生成静态 HTML 页面
- **用户管理** - 三级权限系统（sudo/admin/user），支持用户组管理
- **工单系统** - 可自定义工单模板，支持多种字段类型
- **回收站** - 文章删除后进入回收站，30天缓冲期可恢复
- **密码重置** - 基于 SMTP 邮件的密码重置功能
- **多语言支持** - 完整的中英文国际化
- **系统配置** - 站点标题、描述、背景图片等可配置
- **环境变量监控** - 管理员可查看环境变量配置状态
- **定时清理** - 自动清理过期的待删除文章

## 页面路由

| 路由 | 描述 | 权限 |
|------|------|------|
| `/` | 首页（文章列表） | 公开 |
| `/login` | 登录页面 | 公开 |
| `/register` | 注册页面 | 公开 |
| `/forgot-password` | 忘记密码 | 公开 |
| `/reset-password` | 重置密码 | 公开 |
| `/editor` | 文章编辑器 | 登录用户 |
| `/dashboard` | 用户仪表盘 | 登录用户 |
| `/dashboard/articles` | 文章管理 | 登录用户 |
| `/dashboard/settings` | 用户设置 | 登录用户 |
| `/article/[id]` | 文章详情 | 公开 |
| `/article/view` | 文章查看（通过参数） | 公开 |
| `/[user]` | 用户主页 | 公开 |
| `/[user]/[article]` | 用户文章详情 | 公开 |
| `/admin/users` | 用户管理 | admin/sudo |
| `/admin/groups` | 用户组管理 | admin/sudo |
| `/admin/config` | 系统配置 | admin/sudo |
| `/admin/env` | 环境变量状态 | admin/sudo |
| `/admin/tickets` | 工单模板管理 | admin/sudo |
| `/admin/requests` | 角色升级申请 | admin/sudo |

## API 接口

### 认证相关
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/logout` | 用户登出 |
| GET | `/api/auth/me` | 获取当前用户信息 |
| POST | `/api/auth/reset-password` | 发送密码重置邮件 |
| PUT | `/api/auth/reset-password` | 重置密码 |

### 文章相关
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/articles` | 获取文章列表 |
| POST | `/api/articles` | 创建文章 |
| GET | `/api/articles/[id]` | 获取文章详情 |
| PATCH | `/api/articles/[id]` | 更新文章 |
| DELETE | `/api/articles/[id]` | 删除文章 |

### 用户相关
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/users` | 获取用户列表 |
| GET | `/api/user/profile` | 获取用户资料 |
| PUT | `/api/user/profile` | 更新用户资料 |
| GET | `/api/user-groups` | 获取用户组列表 |
| POST | `/api/user-groups` | 创建用户组 |
| DELETE | `/api/user-groups` | 删除用户组 |

### 系统相关
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/config` | 获取系统配置 |
| POST | `/api/config` | 更新系统配置 |
| PUT | `/api/config` | 从 GitHub 同步配置 |
| GET | `/api/env-status` | 获取环境变量状态 |
| GET | `/api/recycle-bin` | 获取回收站文章 |
| POST | `/api/recycle-bin` | 恢复文章 |
| DELETE | `/api/recycle-bin` | 永久删除文章 |
| GET | `/api/cleanup` | 获取清理统计 |
| POST | `/api/cleanup` | 执行清理任务 |
| GET | `/api/ticket-templates` | 获取工单模板 |
| POST | `/api/ticket-templates` | 创建/更新工单模板 |
| DELETE | `/api/ticket-templates` | 删除工单模板 |
| GET | `/api/admin/users` | 获取所有用户（管理员） |

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16.1.6 |
| 语言 | TypeScript 5.9.3 |
| UI 库 | Ant Design 6.1.1 + @lobehub/ui 5.5.2 |
| 样式 | Tailwind CSS 4.2.2 |
| 数据库 | PostgreSQL + Prisma 6.19.2 |
| 认证 | Jose 6.2.2 (JWT) |
| GitHub | Octokit 5.0.5 |
| 邮件 | Nodemailer 8.0.4 |
| 国际化 | next-intl 4.8.3 |
| 动画 | Motion 12.23.24 |
| Markdown | react-markdown 10.1.0 |
| 包管理 | Bun |

## 环境变量

| 变量名 | 描述 | 必需 | 默认值 |
|--------|------|------|--------|
| `DATABASE_URL` | PostgreSQL 数据库连接字符串 | 是 | - |
| `AUTH_SECRET` | JWT 签名密钥（至少32字符） | 是 | - |
| `APP_URL` | 应用 URL（用于回调等） | 否 | `http://localhost:3000` |
| `GITHUB_REPO` | GitHub 仓库（格式：`用户名/仓库名`） | 否 | - |
| `GITHUB_TOKEN` | GitHub 访问令牌（需要 repo 权限） | 否 | - |
| `CRON_SECRET` | 定时任务认证密钥 | 否 | - |
| `SMTP_HOST` | SMTP 服务器地址 | 否 | - |
| `SMTP_PORT` | SMTP 服务器端口 | 否 | `587` |
| `SMTP_USER` | SMTP 用户名 | 否 | - |
| `SMTP_PASS` | SMTP 密码 | 否 | - |
| `SMTP_FROM` | 发件人邮箱地址 | 否 | - |
| `SMTP_SECURE` | 是否使用 SSL（布尔值） | 否 | 自动（端口465时为true） |
| `POSTGRES_URL` | PostgreSQL 连接地址（备选） | 否 | - |
| `DISABLE_HMR` | 禁用热更新（开发用） | 否 | - |

## 快速开始

```bash
# 克隆项目
git clone <repository-url>
cd ZhouZBoss-Web

# 安装依赖
bun install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入实际配置

# 初始化数据库
bun run db:push

# 生成 Prisma 客户端
bun run db:generate

# 启动开发服务器
bun run dev

# 构建生产版本
bun run build

# 启动生产服务器
bun run start
```

## 项目结构

```
ZhouZBoss-Web/
├── app/                    # Next.js App Router 页面
│   ├── api/               # API 路由
│   │   ├── auth/          # 认证相关 API
│   │   ├── articles/      # 文章相关 API
│   │   ├── users/         # 用户相关 API
│   │   ├── config/        # 系统配置 API
│   │   └── ...            # 其他 API
│   ├── admin/             # 管理员页面
│   ├── dashboard/         # 用户仪表盘
│   ├── editor/            # 文章编辑器
│   ├── login/             # 登录页面
│   ├── register/          # 注册页面
│   └── [user]/            # 用户主页（动态路由）
├── components/            # React 组件
│   ├── Navbar.tsx         # 导航栏
│   ├── Sidebar.tsx        # 侧边栏
│   ├── ArticleCard.tsx    # 文章卡片
│   ├── AuthCard.tsx       # 认证卡片
│   └── MarkdownRenderer.tsx # Markdown 渲染器
├── lib/                   # 工具库
│   ├── auth.ts            # 认证逻辑
│   ├── db.ts              # 数据库接口
│   ├── github.ts          # GitHub 集成
│   ├── mail.ts            # 邮件服务
│   └── user.ts            # 用户管理
├── hooks/                 # React Hooks
│   ├── use-auth.tsx       # 认证 Hook
│   └── use-i18n.ts        # 国际化 Hook
├── i18n/                  # 国际化文件
│   ├── zh-CN.json         # 中文翻译
│   └── en.json            # 英文翻译
├── prisma/                # Prisma 配置
│   └── schema.prisma      # 数据库模型
├── const/                 # 常量定义
│   └── branding.ts        # 品牌配置
└── scripts/               # 脚本文件
    └── db-init.js         # 数据库初始化
```

## 用户角色

| 角色 | 权限 |
|------|------|
| `user` | 创建/编辑/删除自己的文章 |
| `admin` | 管理所有文章、用户、系统配置 |
| `sudo` | 超级管理员，拥有所有权限 |

## 数据库模型

- **User** - 用户表（uid, email, username, name, password, role, userGroup, status）
- **UserGroup** - 用户组表（id, name, description, permissions）
- **OriginiumKV** - 键值存储表（key, value, expiry）

## License

Private project. All rights reserved.
