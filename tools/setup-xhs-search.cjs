/**
 * 启动 Playwright 浏览器 → 搜小红书 → 点筛选 → 点半年内
 * 然后保持浏览器打开，agent 通过 kimi-webbridge 继续操作
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

async function main() {
  const keyword = process.argv[2];
  if (!keyword) {
    console.error("用法: node tools/setup-xhs-search.cjs <搜索关键词>");
    process.exit(1);
  }

  const userDataDir = path.join(__dirname, "..", ".personas", "style-observer", ".browser-data");
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  const extPath = "C:\\Users\\11141\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Extensions\\bnlffdbcfnanfbknnlaflhlhkocccckg\\1.9.13_0";

  console.log("[setup] 启动 Playwright 浏览器...");
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

  // 1. 搜索
  console.log(`[setup] 搜索: ${keyword}`);
  const searchUrl = "https://www.xiaohongshu.com/search_result?keyword=" + encodeURIComponent(keyword);
  await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);

  // 2. 点击筛选按钮
  console.log("[setup] 点击筛选按钮...");
  const filterBtn = await page.locator('text=筛选').first();
  await filterBtn.click();
  await page.waitForTimeout(1000);

  // 3. 点击半年内
  console.log("[setup] 点击半年内...");
  const halfYear = await page.locator('text=半年内').first();
  await halfYear.click();
  await page.waitForTimeout(2000);

  console.log("[setup] ✅ 完成！浏览器保持打开，agent 可通过 kimi-webbridge 继续操作。");
  console.log("[setup] 关闭浏览器窗口或 Ctrl+C 退出。");

  // 保持运行
  await new Promise(() => {});
}

main().catch((err) => {
  console.error("[setup] 失败:", err.message);
  process.exit(1);
});
