/**
 * 截图脚本 - 使用 puppeteer-core
 * 用于查看本地页面效果
 */

const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

async function main() {
  console.log('[Screenshot] Finding Chrome...');
  
  // 查找 Chrome
  let chromePath = null;
  
  // 检查 puppeteer 下载的 Chromium
  const cacheDir = path.join(require('os').homedir(), '.cache', 'ms-playwright', 'chromium-1208', 'chrome-linux64', 'chrome');
  if (fs.existsSync(cacheDir)) {
    chromePath = cacheDir;
    console.log('[Screenshot] Found Chrome at:', chromePath);
  }
  
  if (!chromePath) {
    console.error('[Screenshot] Chrome not found. Please run: npx playwright install chromium');
    process.exit(1);
  }
  
  console.log('[Screenshot] Launching browser...');
  
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // 截取本地登录页面
  const localUrl = 'http://localhost:3000/login';
  console.log(`[Screenshot] Navigating to ${localUrl}...`);
  
  try {
    await page.goto(localUrl, { waitUntil: 'networkidle', timeout: 30000 });
    
    // 等待动画完成
    await page.waitForTimeout(2000);
    
    const screenshotPath = path.join(__dirname, '..', 'login-screenshot.png');
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true
    });
    console.log(`[Screenshot] Login page saved to ${screenshotPath}`);
  } catch (error) {
    console.error('[Screenshot] Failed to capture page:', error.message);
    console.log('[Screenshot] Make sure the dev server is running (npm run dev)');
  }
  
  await browser.close();
  console.log('[Screenshot] Done!');
}

main().catch(console.error);
