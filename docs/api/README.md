# API 文档

## 认证接口

### 登录

```
POST /api/auth/signin
```

**请求体：**

```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

**响应：**

```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "用户名"
  }
}
```

### 登出

```
POST /api/auth/signout
```

### 获取当前用户

```
GET /api/auth/session
```

### 发送密码重置邮件

```
POST /api/auth/reset-password
```

**请求体：**

```json
{
  "email": "user@example.com"
}
```

**响应：**

成功返回 201 状态码。

### 重置密码

```
PUT /api/auth/reset-password
```

**请求体：**

```json
{
  "token": "reset-token",
  "password": "new-password"
}
```

**响应：**

成功返回 201 状态码。

## 文章接口

### 获取文章列表

```
GET /api/posts
```

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码，默认 1 |
| limit | number | 每页数量，默认 10 |
| tag | string | 标签筛选 |
| search | string | 搜索关键词 |

### 获取文章详情

```
GET /api/posts/:id
```

### 创建文章

```
POST /api/posts
```

**请求体：**

```json
{
  "title": "文章标题",
  "slug": "article-slug",
  "content": "文章内容（Markdown）",
  "excerpt": "文章摘要",
  "tags": ["标签1", "标签2"],
  "published": true
}
```

### 更新文章

```
PUT /api/posts/:id
```

### 删除文章

```
DELETE /api/posts/:id
```

## 用户接口

### 获取用户信息

```
GET /api/user
```

### 更新用户信息

```
PUT /api/user
```

**请求体：**

```json
{
  "name": "新用户名",
  "bio": "个人简介",
  "avatar": "头像 URL"
}
```

## 配置接口

### 获取配置

```
GET /api/config
```

**响应：**

```json
{
  "site": {
    "title": "站点标题",
    "description": "站点描述",
    "logo": "Logo URL"
  },
  "social": {
    "github": "https://github.com/username",
    "twitter": "https://twitter.com/username"
  },
  "background": {
    "url": "背景图片URL",
    "opacity": 0.5
  }
}
```

### 更新配置

```
PUT /api/config
```

**请求体：**

```json
{
  "key": "config-key",
  "value": "config-value"
}
```

### 订阅邮件

```
POST /api/subscribe
```

**请求体：**

```json
{
  "email": "subscriber@example.com"
}
```

## 错误响应

所有接口在出错时返回统一格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

### 常见错误码

| 错误码 | 说明 |
|--------|------|
| UNAUTHORIZED | 未登录 |
| FORBIDDEN | 无权限 |
| NOT_FOUND | 资源不存在 |
| VALIDATION_ERROR | 参数验证失败 |
| INTERNAL_ERROR | 服务器内部错误 |
