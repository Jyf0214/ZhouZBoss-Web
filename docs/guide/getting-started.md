# 快速开始

## 环境要求

- Node.js 18.0 或更高版本
- npm 或 bun 包管理器
- PostgreSQL 数据库（推荐使用 Neon 或 Supabase）
- GitHub 账号（用于内容同步）

## 安装步骤

### 1. 克隆项目

```bash
git clone https://github.com/your-username/originium-kernel.git
cd originium-kernel
```

### 2. 安装依赖

```bash
npm install
# 或使用 bun
bun install
```

### 3. 初始化数据库

```bash
npx prisma generate
npx prisma db push
```

## 环境变量配置

复制 `.env.example` 文件为 `.env`，并填写以下配置：

```env
# 数据库连接
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# NextAuth 配置
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# GitHub 配置（用于内容同步）
GITHUB_TOKEN="your-github-token"
GITHUB_REPO="username/repo-name"

# SMTP 邮件配置（可选）
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="your-email@example.com"
SMTP_PASSWORD="your-email-password"
SMTP_FROM="noreply@example.com"
```

## 启动开发服务器

```bash
npm run dev
# 或使用 bun
bun dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

管理后台地址：[http://localhost:3000/dashboard](http://localhost:3000/dashboard)
