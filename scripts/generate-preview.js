/**
 * 生成登录页面静态预览
 * 用于查看 UI 效果
 */

const fs = require('fs');
const path = require('path');

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>登录 - Originium Kernel</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    
    .container {
      width: 100%;
      max-width: 440px;
    }
    
    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: transparent;
      border: none;
      color: #666;
      cursor: pointer;
      font-size: 14px;
      margin-bottom: 32px;
    }
    
    .back-btn:hover {
      color: #1a1a1a;
    }
    
    .card {
      background: #fff;
      border-radius: 24px;
      padding: 32px;
      box-shadow: 
        0 0 15px 0 rgba(0,0,0,0.04),
        0 2px 30px 0 rgba(0,0,0,0.08),
        0 0 0 1px rgba(227,227,227,0.4) inset;
    }
    
    .card-header {
      margin-bottom: 28px;
    }
    
    .card-title {
      font-size: 28px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 12px;
    }
    
    .card-subtitle {
      font-size: 16px;
      color: #666;
      font-weight: 400;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-label {
      display: block;
      font-size: 14px;
      color: #333;
      margin-bottom: 8px;
    }
    
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    
    .input-icon {
      position: absolute;
      left: 12px;
      color: #999;
      pointer-events: none;
    }
    
    .input {
      width: 100%;
      height: 48px;
      padding: 0 16px 0 40px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      font-size: 14px;
      transition: all 0.2s;
    }
    
    .input:focus {
      outline: none;
      border-color: #1677ff;
      box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
    }
    
    .forgot-password {
      text-align: right;
      margin-top: 8px;
    }
    
    .forgot-password a {
      color: #666;
      font-size: 13px;
      text-decoration: none;
    }
    
    .forgot-password a:hover {
      color: #1677ff;
    }
    
    .submit-btn {
      width: 100%;
      height: 48px;
      background: #1677ff;
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 24px;
    }
    
    .submit-btn:hover {
      background: #4096ff;
    }
    
    .submit-btn:active {
      background: #0958d9;
    }
    
    .divider {
      border-top: 1px solid #f0f0f0;
      margin: 20px 0;
    }
    
    .register-link {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding-top: 20px;
    }
    
    .register-link span {
      color: #666;
      font-size: 14px;
    }
    
    .register-link a {
      color: #1677ff;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
    }
    
    .register-link a:hover {
      color: #4096ff;
    }
    
    .footer {
      text-align: center;
      margin-top: 24px;
      color: #999;
      font-size: 13px;
    }
    
    /* SVG Icons */
    .icon {
      width: 18px;
      height: 18px;
      fill: currentColor;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Back Button -->
    <button class="back-btn">
      <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
      </svg>
      返回首页
    </button>
    
    <!-- Login Card -->
    <div class="card">
      <div class="card-header">
        <h1 class="card-title">欢迎回来</h1>
        <p class="card-subtitle">登录以管理您的 Originium Kernel</p>
      </div>
      
      <form>
        <div class="form-group">
          <label class="form-label">用户名</label>
          <div class="input-wrapper">
            <svg class="input-icon icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            <input type="text" class="input" placeholder="请输入用户名"/>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">密码</label>
          <div class="input-wrapper">
            <svg class="input-icon icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
            <input type="password" class="input" placeholder="请输入密码"/>
          </div>
        </div>
        
        <div class="forgot-password">
          <a href="#">忘记密码？</a>
        </div>
        
        <button type="submit" class="submit-btn">登录</button>
        
        <div class="divider"></div>
        
        <div class="register-link">
          <span>还没有账号？</span>
          <a href="#">立即注册</a>
        </div>
      </form>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      Originium Kernel © 2026
    </div>
  </div>
</body>
</html>
`;

const outputPath = path.join(__dirname, '..', 'login-preview.html');
fs.writeFileSync(outputPath, html, 'utf-8');

console.log(`[Preview] Generated static preview at: ${outputPath}`);
console.log('[Preview] Open this file in your browser to see the UI design');
