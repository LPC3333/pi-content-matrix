const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

async function main() {
  const accountName = process.argv[2] || "test";
  const userDataDir = path.join(__dirname, "..", "..", ".personas", accountName, ".browser-data");

  // 确保 browser-data 目录存在
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  console.log(`[test] userDataDir: ${userDataDir}`);
  console.log(`[test] 启动 Edge (Playwright channel=msedge)...`);

  const extPath = "C:\\Users\\11141\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Extensions\\bnlffdbcfnanfbknnlaflhlhkocccckg\\1.9.13_0";

  const browser = await chromium.launchPersistentContext(userDataDir, {
    channel: "msedge",
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`
    ]
  });

  const page = browser.pages()[0] || await browser.newPage();
  console.log("[test] 浏览器已启动，导航到百度...");

  // 先测试百度，确认浏览器本身能工作
  await page.goto("https://www.baidu.com", { waitUntil: "load", timeout: 15000 });
  await page.waitForTimeout(2000);
  const title = await page.title();
  console.log(`[test] 百度标题: ${title}`);

  // 再试小红书
  console.log("[test] 导航到小红书...");
  await page.goto("https://www.xiaohongshu.com/explore", { waitUntil: "load", timeout: 60000 }).catch((err) => {
    console.log(`[test] 小红书加载失败: ${err.message}`);
  });
  await page.waitForTimeout(3000);

  // 检查 Kimi WebBridge 扩展是否注入了
  const injected = await page.evaluate(() => {
    return !!(window.__kimi_webbridge) || !!(window.kimiWebBridge);
  });
  console.log(`[test] Kimi WebBridge 注入状态: ${injected ? "✅ 已注入" : "❌ 未注入"}`);

  // 测试一下 navigate 是否走 daemon
  // 如果扩展注入了，curl navigate 应该能在 Playwright 浏览器里打开页面
  console.log("[test] 浏览器保持打开，30秒后关闭...");
  await page.waitForTimeout(30000);

  await browser.close();
  console.log("[test] 测试完成");
}

main().catch((err) => {
  console.error("[test] 失败:", err.message);
  process.exit(1);
});
