const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const EXT_PATH = "C:\\Users\\11141\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Extensions\\bnlffdbcfnanfbknnlaflhlhkocccckg\\1.9.13_0";
const BASE = path.join(__dirname, "..", "..", ".personas");

function checkLogin(treeStr) {
  // 小红书未登录时页面会显示"手机号登录"或"登录"按钮
  if (treeStr.includes("手机号登录")) return false;
  // 如果出现了"发现""关注""消息""我"等导航，说明已登录
  if (treeStr.includes("发现") && treeStr.includes("关注") && treeStr.includes("消息")) return true;
  // 如果有推荐流内容，大概率已登录
  if (treeStr.length > 5000) return true;
  return "unknown";
}

async function quickCheck(dirName) {
  const userDataDir = path.join(BASE, dirName, ".browser-data");
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

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

  const sess = `quickck-${dirName}`;
  // 导航到小红书首页（不是 explore，是首页——已登录用户会看到推荐流）
  const navResp = JSON.parse(
    execSync(`curl.exe -s -X POST http://127.0.0.1:10086/command -H "Content-Type: application/json" -d "{\\"action\\":\\"navigate\\",\\"args\\":{\\"url\\":\\"https://www.xiaohongshu.com\\",\\"newTab\\":true,\\"group_title\\":\\"${dirName}\\"},\\"session\\":\\"${sess}\\"}"`, { encoding: "utf-8" })
  );

  await new Promise(r => setTimeout(r, 8000));

  const snapResp = JSON.parse(
    execSync(`curl.exe -s -X POST http://127.0.0.1:10086/command -H "Content-Type: application/json" -d "{\\"action\\":\\"snapshot\\",\\"args\\":{},\\"session\\":\\"${sess}\\"}"`, { encoding: "utf-8" })
  );

  const treeStr = JSON.stringify(snapResp.data?.tree || "");
  const status = checkLogin(treeStr);
  console.log(`  ${dirName} → ${status}`);

  // 也检查一下 cookie
  const cookies = await browser.pages()[0].context().cookies("https://www.xiaohongshu.com");
  const keyCookies = cookies.filter(c => c.name.includes("web_session") || c.name.includes("a1") || c.name.includes("webId"));
  console.log(`    cookies: ${keyCookies.map(c => `${c.name}=${c.value.substring(0, 15)}...`).join(", ") || "(无关键cookie)"}`);

  await browser.close();
}

async function main() {
  console.log("=== Cookie 隔离验证 ===\n");

  // 第1步：账号A（之前你登录过的）
  console.log("--- 账号A (account-a) ---");
  await quickCheck("account-a");

  // 第2步：账号B（全新 userDataDir）
  console.log("\n--- 账号B (account-b) ---");
  await quickCheck("account-b");

  // 第3步：账号A 再次确认
  console.log("\n--- 账号A 再次 (account-a) ---");
  await quickCheck("account-a");

  console.log("\n✅ 测试完成。对比上面账号A和账号B的cookie是否不同。");
}

main().catch(console.error);
