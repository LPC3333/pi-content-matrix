const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const EXT_PATH = "C:\\Users\\11141\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Extensions\\bnlffdbcfnanfbknnlaflhlhkocccckg\\1.9.13_0";
const BASE = path.join(__dirname, "..", "..", ".personas");

async function openAccount(dirName, label) {
  const userDataDir = path.join(BASE, dirName, ".browser-data");
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  console.log(`\n━━━ ${label} (${dirName}) ━━━`);
  console.log(`  userDataDir: ${userDataDir}`);

  const browser = await chromium.launchPersistentContext(userDataDir, {
    channel: "msedge",
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`
    ]
  });

  await new Promise(r => setTimeout(r, 3000));

  const sess = `cookie-test-${dirName}`;

  // 导航到小红书
  const nav = JSON.parse(
    execSync(`curl.exe -s -X POST http://127.0.0.1:10086/command -H "Content-Type: application/json" -d "{\\"action\\":\\"navigate\\",\\"args\\":{\\"url\\":\\"https://www.xiaohongshu.com/explore\\",\\"newTab\\":true,\\"group_title\\":\\"${label}\\"},\\"session\\":\\"${sess}\\"}"`, { encoding: "utf-8" })
  );
  console.log(`  navigate: ${nav.ok ? "OK" : "FAIL"}`);

  await new Promise(r => setTimeout(r, 6000));

  // 检查登录状态：页面上有没有"登录"按钮
  const snap = JSON.parse(
    execSync(`curl.exe -s -X POST http://127.0.0.1:10086/command -H "Content-Type: application/json" -d "{\\"action\\":\\"snapshot\\",\\"args\\":{},\\"session\\":\\"${sess}\\"}"`, { encoding: "utf-8" })
  );

  const treeStr = JSON.stringify(snap.data?.tree || "");
  const hasLoginButton = treeStr.includes("手机号登录") || treeStr.includes("登录");

  if (hasLoginButton) {
    console.log(`  📱 状态: 未登录（页面显示登录入口）`);
  } else {
    console.log(`  👤 状态: 已登录（未找到登录入口）`);
  }

  return browser;
}

async function main() {
  console.log("=== Cookie 持久化测试 ===\n");

  // 第1步：账号A 首次打开
  const browserA1 = await openAccount("account-a", "账号A-首次");
  console.log("\n⏸️  请在浏览器中手动登录小红书（如果未登录），然后按 Enter...");
  await new Promise(r => {
    process.stdin.once("data", () => r());
  });

  // 重新 snapshot 确认登录状态
  const snapAfterLogin = JSON.parse(
    execSync(`curl.exe -s -X POST http://127.0.0.1:10086/command -H "Content-Type: application/json" -d "{\\"action\\":\\"snapshot\\",\\"args\\":{},\\"session\\":\\"cookie-test-account-a\\"}"`, { encoding: "utf-8" })
  );
  const treeStr2 = JSON.stringify(snapAfterLogin.data?.tree || "");
  const stillHasLogin = treeStr2.includes("手机号登录") || treeStr2.includes("登录");
  console.log(`  登录后状态: ${stillHasLogin ? "❌ 仍显示登录入口" : "✅ 已登录"}`);

  await browserA1.close();
  console.log("  浏览器已关闭");

  // 第2步：账号B 打开 — 应该未登录
  console.log("\n  --- 切换到账号B ---");
  const browserB = await openAccount("account-b", "账号B");
  console.log("\n  ⏸️  账号B应该显示未登录。按 Enter 继续...");
  await new Promise(r => {
    process.stdin.once("data", () => r());
  });
  await browserB.close();

  // 第3步：账号A 再次打开 — 应该保持登录
  console.log("\n  --- 切回账号A ---");
  const browserA2 = await openAccount("account-a", "账号A-再次");
  console.log("\n  ⏸️  账号A应该显示已登录（如果之前登录了的话）。按 Enter 结束测试...");
  await new Promise(r => {
    process.stdin.once("data", () => r());
  });
  await browserA2.close();

  console.log("\n=== 测试完成 ===");
}

main().catch((err) => {
  console.error("失败:", err.message);
  process.exit(1);
});
