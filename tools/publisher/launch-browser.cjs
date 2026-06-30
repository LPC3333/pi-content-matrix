/**
 * 启动指定账号的浏览器（Playwright + Edge channel + Kimi WebBridge 扩展）。
 * 用法: node launch-browser.cjs <账号名>
 */

const { chromium } = require("playwright");
const path = require("path");

// ── 配置 ──────────────────────────────────────────
const EXT_PATH = "C:\\Users\\11141\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Extensions\\bnlffdbcfnanfbknnlaflhlhkocccckg\\1.9.13_0";
const BASE = path.join(__dirname, "..", "..", ".personas");
// ──────────────────────────────────────────────────

async function main() {
  const accountName = process.argv[2];
  if (!accountName) {
    console.error("用法: node launch-browser.cjs <账号名>");
    process.exit(1);
  }

  const userDataDir = path.join(BASE, accountName, ".browser-data");
  const fs = require("fs");
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  console.log(`[launch] 账号: ${accountName}`);
  console.log(`[launch] userDataDir: ${userDataDir}`);

  const browser = await chromium.launchPersistentContext(userDataDir, {
    channel: "msedge",
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`
    ]
  });

  console.log("[launch] 浏览器已启动。关闭窗口或 Ctrl+C 退出。");

  // 保持运行直到用户关闭
  await new Promise(() => {}); // never resolves
}

main().catch((err) => {
  console.error("[launch] 失败:", err.message);
  process.exit(1);
});
