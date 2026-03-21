# 环境变量配置指南

## 必需的环境变量

### 1. DATABASE_URL (必需)

数据库连接字符串，支持以下类型：

#### Redis (推荐用于开发)
```
DATABASE_URL=redis://localhost:6379
```

#### Redis with password
```
DATABASE_URL=redis://:password@host:port
```

#### MySQL
```
DATABASE_URL=mysql://user:password@localhost:3306/database_name
```

#### PostgreSQL
```
DATABASE_URL=postgresql://user:password@localhost:5432/database_name
```

### 2. AUTH_SECRET (必需)

用于会话加密的密钥，至少 32 个字符：

```bash
# 生成随机密钥
openssl rand -base64 32
# 或使用 node
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

示例：
```
AUTH_SECRET=your-secret-key-at-least-32-characters-long
```

## 可选的环境变量

### APP_URL
应用 URL（用于回调等）
```
APP_URL=https://your-domain.com
```

### GITHUB_REPO
GitHub 仓库（用于内容同步）
```
GITHUB_REPO=username/repo-name
```

### GITHUB_TOKEN
GitHub Token
```
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

### CRON_SECRET
定时任务密钥
```
CRON_SECRET=your-cron-secret
```

## 在 Vercel 上配置

1. 访问 https://vercel.com/dashboard
2. 选择你的项目
3. 进入 Settings → Environment Variables
4. 添加以下变量：
   - `DATABASE_URL`
   - `AUTH_SECRET`
5. 重新部署项目

## 本地开发

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

然后编辑 `.env.local` 填入你的配置。

## 使用 Upstash Redis (免费)

1. 访问 https://upstash.com
2. 创建免费账户
3. 创建新的 Redis 数据库
4. 复制 REST API URL 或 Connection String
5. 设置 `DATABASE_URL`

示例：
```
DATABASE_URL=redis://default:password@host:port
```

## 故障排除

### "DATABASE_URL is required"
确保已设置 `DATABASE_URL` 环境变量

### "AUTH_SECRET is required"
确保已设置 `AUTH_SECRET` 环境变量，且长度至少 32 字符

### "Reached the max retries per request limit"
- 检查 Redis 服务是否运行
- 检查 DATABASE_URL 格式是否正确
- 检查网络连接/防火墙设置
- 如果使用 Upstash，确认账户状态正常
