const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

async function testAccount(dirName, accountName) {
  const userDataDir = path.join(__dirname, "..", "..", ".personas", dirName, ".browser-data");
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  const extPath = "C:\\Users\\11141\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Extensions\\bnlffdbcfnanfbknnlaflhlhkocccckg\\1.9.13_0";

  console.log(`\n[${accountName}] 启动浏览器...`);
  const browser = await chromium.launchPersistentContext(userDataDir, {
    channel: "msedge",
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`
    ]
  });

  // 等待扩展连接
  await new Promise(r => setTimeout(r, 3000));

  // 检查 daemon 连接状态
  const status = JSON.parse(
    execSync('"C:\\Users\\11141\\.kimi-webbridge\\bin\\kimi-webbridge.exe" status', { encoding: "utf-8" })
  );
  console.log(`[${accountName}] 扩展连接: ${status.extension_connected ? "✅" : "❌"}`);

  // 用 kimi-webbridge API 导航到小红书
  const sess = `test-${dirName}`;
  const navResp = JSON.parse(
    execSync(`curl.exe -s -X POST http://127.0.0.1:10086/command -H "Content-Type: application/json" -d "{\\"action\\":\\"navigate\\",\\"args\\":{\\"url\\":\\"https://www.xiaohongshu.com/explore\\",\\"newTab\\":true,\\"group_title\\":\\"${accountName}\\"},\\"session\\":\\"${sess}\\"}"`, { encoding: "utf-8" })
  );
  console.log(`[${accountName}] navigate: ${navResp.ok ? "✅" : "❌"} ${navResp.data?.url || navResp.error?.message}`);

  await new Promise(r => setTimeout(r, 5000));

  // snapshot
  const snapResp = JSON.parse(
    execSync(`curl.exe -s -X POST http://127.0.0.1:10086/command -H "Content-Type: application/json" -d "{\\"action\\":\\"snapshot\\",\\"args\\":{},\\"session\\":\\"${sess}\\"}"`, { encoding: "utf-8" })
  );
  console.log(`[${accountName}] snapshot: ${snapResp.ok ? "✅" : "❌"} ${snapResp.data?.title || ""}`);

  await new Promise(r => setTimeout(r, 2000));

  await browser.close();
  console.log(`[${accountName}] 浏览器已关闭`);
}

async function main() {
  await testAccount("账号A", "账号A");
  
  // 等 daemon 意识到浏览器关闭
  await new Promise(r => setTimeout(r, 3000));

  await testAccount("账号B", "账号B");

  console.log("\n✅ 两轮切换测试完成");
}

main().catch((err) => {
  console.error("失败:", err.message);
  process.exit(1);
});
