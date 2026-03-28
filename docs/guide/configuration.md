# 配置说明

## 数据库配置

系统使用 PostgreSQL 数据库，推荐使用 Neon 或 Supabase 托管服务。

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
```

### 数据库初始化

```bash
# 生成 Prisma 客户端
npx prisma generate

# 同步数据库结构
npx prisma db push

# 查看数据库（可选）
npx prisma studio
```

## GitHub 同步配置

系统支持将内容自动同步到 GitHub 仓库。

```env
# GitHub Personal Access Token
GITHUB_TOKEN="ghp_xxxxxxxxxxxx"

# 目标仓库（格式：owner/repo）
GITHUB_REPO="username/my-blog"

# 同步分支（默认 main）
GITHUB_BRANCH="main"
```

### 创建 GitHub Token

1. 访问 GitHub Settings → Developer settings → Personal access tokens
2. 点击 "Generate new token (classic)"
3. 勾选 `repo` 权限
4. 生成并复制 Token

## SMTP 邮件配置

配置 SMTP 服务以支持邮箱订阅通知功能。

```env
SMTP_HOST="smtp.gmail.com"    # SMTP服务器地址
SMTP_PORT="587"               # SMTP端口（默认587）
SMTP_USER="your-email@gmail.com"  # SMTP用户名
SMTP_PASS="your-app-password"     # SMTP密码
SMTP_FROM="Your Name <noreply@yourdomain.com>"  # 发件人地址
SMTP_SECURE="false"           # 是否使用SSL（true/false）
```

### 常用邮箱配置

| 邮箱服务商 | SMTP 地址 | 端口 |
|-----------|----------|------|
| Gmail | smtp.gmail.com | 587 |
| Outlook | smtp.office365.com | 587 |
| QQ 邮箱 | smtp.qq.com | 465 |
| 163 邮箱 | smtp.163.com | 465 |

## 管理员密码重置

构建时可通过环境变量强制更新 admin/sudo 用户密码。

```env
ADMIN_PASSWORD="your-new-password"
```

设置此环境变量后，在构建过程中会自动更新管理员账户的密码。

## 背景主题配置

系统支持自定义背景主题，在管理后台的配置页面进行设置。

### 支持的背景类型

- **渐变背景**：自定义渐变色
- **图片背景**：上传或使用外部图片链接
- **纯色背景**：单一颜色背景

### 配置说明

- **自定义背景图片URL**：在管理后台配置页面设置背景图片地址
- **蒙板透明度**：设置背景蒙板的透明度（0-100%），0为完全透明，100为完全不透明

### 配置示例

在数据库 `config` 表中添加或修改：

```json
{
  "key": "background",
  "value": {
    "type": "gradient",
    "data": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  }
}
```

### 主题变量

可通过 CSS 变量自定义主题：

```css
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --background-color: #ffffff;
  --text-color: #1a1a1a;
}
```
