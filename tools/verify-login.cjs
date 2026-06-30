/**
 * 仅打开浏览器搜索页，不做任何操作，供人工验证登录状态
 * 用法: node tools/verify-login.cjs <账号名>
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const EXT_PATH = "C:\\Users\\11141\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Extensions\\bnlffdbcfnanfbknnlaflhlhkocccckg\\1.9.13_0";
const BASE = path.join(__dirname, "..", ".personas");

async function main() {
  const accountName = process.argv[2] || "persona-bootstrap";
  const userDataDir = path.join(BASE, accountName, ".browser-data");
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  // 锁定 Cookie
  const cookieFile = path.join(userDataDir, "Default", "Cookies");
  if (fs.existsSync(cookieFile)) { try { fs.chmodSync(cookieFile, 0o444); } catch {} }

  console.log(`[verify] 启动浏览器 (account: ${accountName})`);
  const browser = await chromium.launchPersistentContext(userDataDir, {
    channel: "msedge", headless: false, viewport: { width: 1440, height: 900 },
    args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`]
  });

  const page = browser.pages()[0] || await browser.newPage();
  
  console.log("[verify] 打开小红书首页...");
  await page.goto("https://www.xiaohongshu.com", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000);

  console.log("[verify] 浏览器保持打开，手动关闭窗口退出");
  await new Promise(() => {});
}

main().catch(e => { console.error(e.message); process.exit(1); });
