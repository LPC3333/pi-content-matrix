/**
 * 小红书搜索结果时间筛选辅助脚本
 * 用法: node tools/click-filter.cjs <账号名> <x坐标> <y坐标>
 * 用于在已打开的 Playwright 浏览器中执行原生坐标点击
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

async function main() {
  const accountName = process.argv[2] || "persona-bootstrap";
  const x = parseInt(process.argv[3]);
  const y = parseInt(process.argv[4]);

  if (!process.argv[3] || !process.argv[4]) {
    console.error("用法: node tools/click-filter.cjs <账号名> <x坐标> <y坐标>");
    process.exit(1);
  }

  const userDataDir = path.join(__dirname, "..", "..", ".personas", accountName, ".browser-data");
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  const extPath = "C:\\Users\\11141\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Extensions\\bnlffdbcfnanfbknnlaflhlhkocccckg\\1.9.13_0";

  console.log(`[click-filter] 启动浏览器 (account: ${accountName})`);

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
  await page.waitForTimeout(1000);

  // 用 Playwright 原生坐标点击
  console.log(`[click-filter] 点击坐标 (${x}, ${y})`);
  await page.mouse.click(x, y);
  
  console.log("[click-filter] 完成，保持打开 5 秒后退出");
  await page.waitForTimeout(5000);
  await browser.close();
  console.log("[click-filter] 已关闭");
}

main().catch((err) => {
  console.error("[click-filter] 失败:", err.message);
  process.exit(1);
});
