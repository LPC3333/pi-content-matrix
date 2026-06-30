/**
 * 启动浏览器 + 通过 Kimi WebBridge 检测小红书登录状态。
 * 如果未登录，等待 30 秒供手动操作。
 * 用法: node check-login.cjs <账号名>
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

// ── 配置 ──────────────────────────────────────────
const EXT_PATH = "C:\\Users\\11141\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Extensions\\bnlffdbcfnanfbknnlaflhlhkocccckg\\1.9.13_0";
const BASE = path.join(__dirname, "..", "..", ".personas");
// ──────────────────────────────────────────────────

function wbCommand(json) {
  return JSON.parse(
    execSync(`curl.exe -s -X POST http://127.0.0.1:10086/command -H "Content-Type: application/json" -d "${json.replace(/"/g, '\\"')}"`, { encoding: "utf-8" })
  );
}

function checkLogin(treeStr) {
  if (treeStr.includes("手机号登录")) return false;
  if (treeStr.includes("发现") && treeStr.includes("关注") && treeStr.includes("消息")) return true;
  return treeStr.length > 5000 ? true : "unknown";
}

async function main() {
  const accountName = process.argv[2];
  if (!accountName) {
    console.error("用法: node check-login.cjs <账号名>");
    process.exit(1);
  }

  const userDataDir = path.join(BASE, accountName, ".browser-data");
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  console.log(`[check] 账号: ${accountName}`);

  const browser = await chromium.launchPersistentContext(userDataDir, {
    channel: "msedge",
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`
    ]
  });

  await new Promise(r => setTimeout(r, 4000));

  const sess = `check-${accountName}`;

  // 导航到小红书首页
  const navCmd = JSON.stringify({
    action: "navigate",
    args: { url: "https://www.xiaohongshu.com", newTab: true, group_title: accountName },
    session: sess
  });
  const nav = JSON.parse(
    execSync(`curl.exe -s -X POST http://127.0.0.1:10086/command -H "Content-Type: application/json" -d "${navCmd.replace(/"/g, '\\"')}"`, { encoding: "utf-8" })
  );
  if (!nav.ok) {
    console.error("[check] navigate 失败:", nav.error?.message);
    await browser.close();
    process.exit(1);
  }

  await new Promise(r => setTimeout(r, 8000));

  // snapshot 检测登录状态
  const snapCmd = JSON.stringify({ action: "snapshot", args: {}, session: sess });
  const snap = JSON.parse(
    execSync(`curl.exe -s -X POST http://127.0.0.1:10086/command -H "Content-Type: application/json" -d "${snapCmd.replace(/"/g, '\\"')}"`, { encoding: "utf-8" })
  );

  const treeStr = JSON.stringify(snap.data?.tree || "");
  const status = checkLogin(treeStr);

  if (status === true) {
    console.log("[check] ✅ 已登录");
  } else if (status === false) {
    console.log("[check] ❌ 未登录，等待 30 秒供手动登录...");
    await new Promise(r => setTimeout(r, 30000));
    // 再检查一次
    const snap2Cmd = JSON.stringify({ action: "snapshot", args: {}, session: sess });
    const snap2 = JSON.parse(
      execSync(`curl.exe -s -X POST http://127.0.0.1:10086/command -H "Content-Type: application/json" -d "${snap2Cmd.replace(/"/g, '\\"')}"`, { encoding: "utf-8" })
    );
    const status2 = checkLogin(JSON.stringify(snap2.data?.tree || ""));
    console.log(`[check] 最终状态: ${status2 === true ? "✅ 已登录" : "❌ 仍未登录"}`);
  } else {
    console.log("[check] ⚠️ 登录状态不确定，请手动检查浏览器窗口");
  }

  // 输出 cookie 摘要
  const cookies = await browser.pages()[0].context().cookies("https://www.xiaohongshu.com");
  const keyCookies = cookies.filter(c => ["web_session", "a1", "webId"].includes(c.name));
  if (keyCookies.length > 0) {
    console.log(`[check] cookie: ${keyCookies.map(c => `${c.name}=${c.value.substring(0, 12)}...`).join(", ")}`);
  }

  await browser.close();
  console.log("[check] 完成");
}

main().catch((err) => {
  console.error("[check] 失败:", err.message);
  process.exit(1);
});
