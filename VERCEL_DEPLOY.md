# Vercel 部署指南

## 问题诊断

根据日志分析，当前部署存在以下问题：

### 1. 环境变量缺失
```
Environment validation failed: Missing required environment variables:
DATABASE_URL is required
AUTH_SECRET is required
```

### 2. Redis 连接错误
```
Reached the max retries per request limit (which is 20)
```

### 3. 注册失败 (400)
由于数据库未连接，无法创建用户

## 解决方案

### 步骤 1: 配置 Vercel 环境变量

1. 访问 https://vercel.com/dashboard
2. 选择项目 `zhou-z-boss-web`
3. 进入 **Settings** → **Environment Variables**
4. 添加以下环境变量：

#### DATABASE_URL (必需)
推荐使用 **Upstash Redis** (免费):

1. 访问 https://upstash.com
2. 注册/登录
3. 创建新数据库 (选择 **Redis**)
4. 选择 **Connect** → **Connect with Redis** → **Copy Connection String**
5. 在 Vercel 中添加环境变量：
   - Name: `DATABASE_URL`
   - Value: `redis://default:YOUR_PASSWORD@HOST:PORT`
   - 勾选所有环境 (Production/Preview/Development)

#### AUTH_SECRET (必需)
生成随机密钥：
```bash
# 使用 openssl
openssl rand -base64 32

# 或使用 node
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

在 Vercel 中添加：
- Name: `AUTH_SECRET`
- Value: 生成的密钥 (至少 32 字符)
- 勾选所有环境

### 步骤 2: 重新部署

保存环境变量后，重新部署项目：

1. 进入 **Deployments** 标签
2. 点击最新部署的 **...** → **Redeploy**
3. 或推送新的 git 提交触发自动部署

### 步骤 3: 验证

部署完成后：

1. 访问 https://zhou-z-boss-nyol3ph6z-jyf20100214s-projects.vercel.app
2. 尝试注册新用户
3. 检查 **Logs** 确认无错误

## 日志查看

### Vercel Logs
1. 访问项目 dashboard
2. 进入 **Logs** 标签
3. 查看实时日志和错误信息

### 函数日志
如果看不到函数日志，检查：
- 环境变量是否正确配置
- 函数是否正确输出 `console.log`
- 是否有权限查看日志

## 本地测试

在本地测试配置：

```bash
# 复制环境变量示例
cp .env.example .env.local

# 编辑 .env.local 填入实际值
# DATABASE_URL=redis://your-redis-url
# AUTH_SECRET=your-secret-key

# 运行开发服务器
npm run dev
```

## 常见问题

### Q: 为什么注册 API 返回 400？
A: 因为 `DATABASE_URL` 未配置，无法连接数据库存储用户数据。

### Q: 为什么看不到函数日志？
A: Vercel 的日志需要：
- 正确的权限
- 函数实际执行了 `console.log`
- 没有提前返回错误

### Q: 使用什么数据库？
A: 推荐使用 **Upstash Redis** (免费，适合 Vercel):
- 无服务器架构
- 按请求付费
- 全球边缘节点

### Q: 可以不用 Redis 吗？
A: 可以，支持 MySQL 和 PostgreSQL：
- MySQL: `mysql://user:pass@host:port/db`
- PostgreSQL: `postgresql://user:pass@host:port/db`

## 参考链接

- [Vercel 环境变量文档](https://vercel.com/docs/concepts/projects/environment-variables)
- [Upstash Redis](https://upstash.com/docs/redis)
- [ioredis 文档](https://github.com/luin/ioredis)
