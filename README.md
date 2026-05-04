# Originium Kernel

一个基于 Next.js 16 构建的现代内容发布平台，支持文章管理、GitHub 同步、用户系统、工单系统、人脸画廊等功能。

## 核心功能

- **Clerk 认证（可选）** - 集成 Clerk 身份认证，支持邮箱/社交登录，可选启用
- **文章管理** - 创建、编辑、删除文章，支持 Markdown 格式与语法高亮
- **Posts 系统** - 支持公开/私密文章，基于 slug 的 URL 路由
- **Faces 画廊** - 人脸/图片画廊管理，支持 CRUD 操作
- **GitHub 同步** - 发布文章自动同步到 GitHub 仓库
- **用户管理** - 三级权限系统（sudo/admin/user），支持用户组管理
- **工单系统** - 可自定义工单模板，支持多种字段类型
- **回收站** - 文章删除后进入回收站，30天缓冲期可恢复
- **密码重置** - 基于 SMTP 邮件的密码重置功能
- **多语言支持** - 完整的中英文国际化（next-intl）
- **系统配置** - 站点标题、描述、背景图片、自定义 CSS/Head 等可配置
- **环境变量监控** - 管理员可查看环境变量配置状态
- **定时清理** - 自动清理过期的待删除文章
- **暗色模式** - 自动检测系统主题偏好

## 页面路由

| 路由 | 描述 | 权限 |
|------|------|------|
| `/` | 首页（文章列表） | 公开 |
| `/posts` | Posts 列表 | 公开 |
| `/posts/private` | 私密 Posts | 登录用户 |
| `/posts/[...slug]` | Post 详情（slug 路由） | 公开 |
| `/faces` | Faces 画廊 | 公开 |
| `/faces/[...slug]` | Face 详情 | 公开 |
| `/faces/new` | 创建 Face | 登录用户 |
| `/faces/edit/[...slug]` | 编辑 Face | 登录用户 |
| `/tickets` | 工单列表 | 登录用户 |
| `/tickets/new` | 创建工单 | 登录用户 |
| `/tickets/[...slug]` | 工单详情 | 登录用户 |
| `/login` | 登录页面 | 公开 |
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
| `/clerk/sign-in` | Clerk 登录 | 公开 |
| `/clerk/sign-up` | Clerk 注册 | 公开 |
| `/clerk/bind` | Clerk 账号绑定 | 登录用户 |
| `/clerk/after-auth` | Clerk 认证后回调 | 登录用户 |
| `/admin/users` | 用户管理 | admin/sudo |
| `/admin/groups` | 用户组管理 | admin/sudo |
| `/admin/config` | 系统配置 | admin/sudo |
| `/admin/env` | 环境变量状态 | admin/sudo |
| `/admin/tickets` | 工单模板管理 | admin/sudo |
| `/admin/tickets/new` | 创建工单模板 | admin/sudo |
| `/admin/requests` | 角色升级申请 | admin/sudo |

## API 接口

### 认证相关
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/logout` | 用户登出 |
| GET | `/api/auth/me` | 获取当前用户信息 |
| POST | `/api/auth/reset-password` | 发送密码重置邮件 |
| PUT | `/api/auth/reset-password` | 重置密码 |
| POST | `/api/auth/bind-send-code` | 发送绑定验证码 |
| POST | `/api/auth/bind-verify` | 验证绑定码 |
| GET | `/api/auth/clerk-check` | Clerk 认证状态检查 |

### 文章相关
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/articles` | 获取文章列表 |
| POST | `/api/articles` | 创建文章 |
| GET | `/api/articles/[id]` | 获取文章详情 |
| PATCH | `/api/articles/[id]` | 更新文章 |
| DELETE | `/api/articles/[id]` | 删除文章 |

### Posts 相关
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/posts` | 获取 Posts 列表 |
| POST | `/api/posts` | 创建 Post |

### Faces 相关
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/faces` | 获取 Faces 列表 |
| POST | `/api/faces` | 创建 Face |
| * | `/api/faces/[...slug]` | Face CRUD 操作 |

### 工单相关
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/tickets` | 获取工单列表 |
| POST | `/api/tickets` | 创建工单 |
| * | `/api/tickets/[...slug]` | 工单详情/操作 |
| GET | `/api/ticket-templates` | 获取工单模板 |
| POST | `/api/ticket-templates` | 创建/更新工单模板 |
| DELETE | `/api/ticket-templates` | 删除工单模板 |

### 用户相关
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/users` | 获取用户列表 |
| GET | `/api/users/[uid]` | 获取用户详情 |
| GET | `/api/user/profile` | 获取用户资料 |
| PUT | `/api/user/profile` | 更新用户资料 |
| GET | `/api/user-groups` | 获取用户组列表 |
| POST | `/api/user-groups` | 创建用户组 |
| DELETE | `/api/user-groups` | 删除用户组 |
| GET | `/api/u/[username]/[articleId]` | 用户文章（短链） |

### 系统相关
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/config` | 获取系统配置 |
| POST | `/api/config` | 更新系统配置 |
| GET | `/api/site-config` | 获取站点配置 |
| PUT | `/api/github` | GitHub 同步操作 |
| GET | `/api/env-status` | 获取环境变量状态 |
| GET | `/api/recycle-bin` | 获取回收站文章 |
| POST | `/api/recycle-bin` | 恢复文章 |
| DELETE | `/api/recycle-bin` | 永久删除文章 |
| GET | `/api/cleanup` | 获取清理统计 |
| POST | `/api/cleanup` | 执行清理任务 |
| GET | `/api/admin/users` | 获取所有用户（管理员） |
| POST | `/api/webhooks/clerk` | Clerk Webhook 回调 |

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16.2.4 (App Router, Standalone) |
| 语言 | TypeScript 5.9.3 |
| UI 库 | Ant Design 6.1.1 |
| 样式 | Tailwind CSS 4.2.2 + antd-style |
| 数据库 | PostgreSQL + Prisma 6.19.2 |
| 认证 | Clerk（可选） + Jose 6.2.2 (JWT) |
| GitHub | Octokit 5.0.5 |
| 邮件 | Nodemailer 8.0.4 |
| 国际化 | next-intl 4.8.3 |
| 动画 | Motion 12.23.24 |
| Markdown | react-markdown 10.1.0 + react-syntax-highlighter |
| 测试 | Vitest 4.1.5 |
| 包管理 | Bun |

## 环境变量

| 变量名 | 描述 | 必需 | 默认值 |
|--------|------|------|--------|
| `DATABASE_URL` | PostgreSQL 数据库连接字符串 | 是 | - |
| `AUTH_SECRET` | JWT 签名密钥（至少32字符） | 是 | - |
| `ADMIN_EMAIL` | 初始管理员邮箱 | 否 | - |
| `ADMIN_PASSWORD` | 初始管理员密码 | 否 | - |
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
| `POSTGRES_PRISMA_URL` | PostgreSQL Prisma 专用连接地址 | 否 | - |
| `POSTGRES_URL_NON_POOLING` | PostgreSQL 非连接池地址 | 否 | - |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk 公钥（启用 Clerk 认证时需要） | 否 | - |
| `CLERK_SECRET_KEY` | Clerk 私钥（启用 Clerk 认证时需要） | 否 | - |
| `SKIP_DB_INIT` | 跳过数据库初始化 | 否 | - |
| `DISABLE_HMR` | 禁用热更新（开发用） | 否 | - |

## 快速开始

```bash
# 克隆项目
git clone <repository-url>
cd PrivateJournal

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

### 可用脚本

| 命令 | 描述 |
|------|------|
| `bun run dev` | 启动开发服务器 |
| `bun run build` | 类型检查 + Lint + 测试 + 构建 |
| `bun run start` | 启动生产服务器 |
| `bun run test` | 运行 Vitest 测试 |
| `bun run check` | 类型检查 + Lint |
| `bun run type-check` | TypeScript 类型检查 |
| `bun run lint` | ESLint 检查 |
| `bun run db:push` | 推送数据库 Schema |
| `bun run db:generate` | 生成 Prisma 客户端 |
| `bun run db:migrate` | 运行数据库迁移 |
| `bun run db:studio` | 启动 Prisma Studio |
| `bun run db:init` | 初始化数据库（种子数据） |
| `bun run clean` | 清理 Next.js 构建缓存 |

## 项目结构

```
PrivateJournal/
├── app/                        # Next.js App Router 页面与 API
│   ├── api/                    # API 路由
│   │   ├── auth/               # 认证相关 API
│   │   ├── articles/           # 文章 CRUD API
│   │   ├── posts/              # Posts API
│   │   ├── faces/              # Faces 画廊 API
│   │   ├── tickets/            # 工单 API
│   │   ├── ticket-templates/   # 工单模板 API
│   │   ├── users/              # 用户 API
│   │   ├── user/               # 用户资料 API
│   │   ├── user-groups/        # 用户组 API
│   │   ├── config/             # 系统配置 API
│   │   ├── site-config/        # 站点配置 API
│   │   ├── github/             # GitHub 同步 API
│   │   ├── recycle-bin/        # 回收站 API
│   │   ├── cleanup/            # 定时清理 API
│   │   ├── env-status/         # 环境变量状态 API
│   │   ├── admin/              # 管理员 API
│   │   ├── webhooks/           # Webhook 回调（Clerk）
│   │   └── u/                  # 用户短链 API
│   ├── admin/                  # 管理员页面
│   ├── clerk/                  # Clerk 认证页面
│   ├── dashboard/              # 用户仪表盘
│   ├── editor/                 # 文章编辑器
│   ├── posts/                  # Posts 页面
│   ├── faces/                  # Faces 画廊页面
│   ├── tickets/                # 工单页面
│   ├── article/                # 文章详情页面
│   ├── login/                  # 登录页面
│   └── [user]/                 # 用户主页（动态路由）
├── components/                 # React 组件
│   ├── Navbar.tsx              # 导航栏
│   ├── Sidebar.tsx             # 侧边栏
│   ├── ArticleCard.tsx         # 文章卡片
│   ├── AuthCard.tsx            # 认证卡片
│   ├── AuthLayout.tsx          # 认证布局
│   ├── Avatar.tsx              # 头像组件
│   ├── BackgroundProvider.tsx  # 背景主题 Provider
│   ├── ClerkAuthProvider.tsx   # Clerk 认证 Provider
│   ├── ClerkLoginSection.tsx   # Clerk 登录区域
│   ├── ConfigProvider.tsx      # 配置 Provider
│   ├── CustomHead.tsx          # 自定义 Head 标签
│   ├── LanguageSwitcher/       # 语言切换器
│   ├── MarkdownRenderer.tsx    # Markdown 渲染器
│   ├── Sidebar/                # 侧边栏组件
│   ├── UserGroupBadge.tsx      # 用户组徽章
│   ├── UserMenu.tsx            # 用户菜单
│   └── style.ts                # 全局样式
├── lib/                        # 工具库
│   ├── auth.ts                 # 认证逻辑
│   ├── config.ts               # 配置管理
│   ├── content.ts              # 内容管理
│   ├── db.ts                   # 数据库接口
│   ├── env.ts                  # 环境变量
│   ├── github.ts               # GitHub 集成
│   ├── mail.ts                 # 邮件服务
│   ├── markdown.ts             # Markdown 处理
│   ├── prisma.ts               # Prisma 客户端
│   ├── tickets.ts              # 工单逻辑
│   ├── ui.ts                   # UI 工具
│   ├── user.ts                 # 用户管理
│   ├── utils.ts                # 通用工具函数
│   └── utils/                  # 工具函数子模块
│       ├── env.ts              # 环境变量工具
│       └── platform.ts         # 平台检测工具
├── hooks/                      # React Hooks
│   ├── use-auth.tsx            # 认证 Hook
│   ├── use-i18n.ts             # 国际化 Hook
│   ├── use-mobile.ts           # 移动端检测 Hook
│   └── useIsDark.ts            # 暗色模式 Hook
├── i18n/                       # 国际化配置
│   ├── config.ts               # i18n 配置
│   ├── provider.tsx            # i18n Provider
│   ├── zh-CN.json              # 中文翻译
│   └── en.json                 # 英文翻译
├── const/                      # 常量定义
│   ├── branding.ts             # 品牌配置
│   └── url.ts                  # URL 常量
├── prisma/                     # Prisma 配置
│   └── schema.prisma           # 数据库模型
├── scripts/                    # 脚本文件
│   └── db-init.js              # 数据库初始化
├── proxy.ts                    # Next.js 16 代理（原 middleware）
├── i18n.ts                     # 国际化入口
├── config.json                 # 站点配置
├── metadata.json               # 应用元数据
└── next.config.ts              # Next.js 配置
```

## 用户角色

| 角色 | 权限 |
|------|------|
| `user` | 创建/编辑/删除自己的文章、Posts、Faces |
| `admin` | 管理所有文章、用户、系统配置、工单模板 |
| `sudo` | 超级管理员，拥有所有权限 |

## 数据库模型

- **User** - 用户表（uid, email, username, name, password, role, userGroup, status, clerkId, clerkLinkedAt）
- **UserGroup** - 用户组表（id, name, description, permissions）
- **OriginiumKV** - 键值存储表（key, value, expiry）

## 站点配置

通过 `config.json` 或管理员面板配置：

```json
{
  "site": {
    "title": "Originium Kernel",
    "description": "现代内容发布平台",
    "lang": "zh-CN"
  },
  "appearance": {
    "background": { "url": "", "opacity": 0.8 },
    "customCSS": "",
    "customHead": ""
  },
  "access": {
    "posts": { "public": ["*"], "private": [] },
    "faces": { "public": ["*"], "private": [] }
  },
  "auth": {
    "allowRegistration": true
  }
}
```

## License

Private project. All rights reserved.
