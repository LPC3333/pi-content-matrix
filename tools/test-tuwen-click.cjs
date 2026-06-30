const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const EXT_PATH = "C:\\Users\\11141\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Extensions\\bnlffdbcfnanfbknnlaflhlhkocccckg\\1.9.13_0";
const BASE = path.join(__dirname, "..", ".personas");

async function main() {
  const userDataDir = path.join(BASE, "persona-bootstrap", ".browser-data");
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  const browser = await chromium.launchPersistentContext(userDataDir, {
    channel: "msedge", headless: false, viewport: { width: 1440, height: 900 },
    args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`]
  });

  const page = browser.pages()[0] || await browser.newPage();

  console.log("[test] 搜索 桌面收纳");
  await page.goto("https://www.xiaohongshu.com/search_result?keyword=" + encodeURIComponent("桌面收纳"), {
    waitUntil: "domcontentloaded", timeout: 30000
  });
  await page.waitForTimeout(5000);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1000);

  // 记录筛选前的帖子（取第一条作为指纹）
  const before = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="/explore/"]');
    return Array.from(links).slice(0, 5).map(a => a.href.split("?")[0]);
  });
  console.log("[test] 筛选前前5条:");
  before.forEach(h => console.log("  " + h.split("/").pop()));

  // 打开筛选面板
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*')).find(e =>
      e.offsetParent && e.textContent.trim() === '筛选' &&
      (e.tagName === 'SPAN' || e.tagName === 'DIV')
    );
    if (el) {
      const r = el.getBoundingClientRect();
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: r.left + r.width/2, clientY: r.top + r.height/2 }));
    }
  });
  await page.waitForTimeout(1000);

  // 点图文
  console.log("[test] 点图文 (1244, 344)");
  await page.mouse.click(1244, 344);
  await page.waitForTimeout(500);

  // 重新打开筛选面板（点图文后可能关闭了）
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*')).find(e =>
      e.offsetParent && e.textContent.trim() === '筛选' &&
      (e.tagName === 'SPAN' || e.tagName === 'DIV')
    );
    if (el) {
      const r = el.getBoundingClientRect();
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: r.left + r.width/2, clientY: r.top + r.height/2 }));
    }
  });
  await page.waitForTimeout(1000);

  // 点半年内
  console.log("[test] 点半年内");
  const halfYearPos = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*')).find(e =>
      e.offsetParent && e.textContent.trim() === '半年内' &&
      e.parentElement && e.parentElement.parentElement &&
      e.parentElement.parentElement.textContent.includes('发布时间')
    );
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) };
  });
  if (halfYearPos) {
    await page.mouse.click(halfYearPos.x, halfYearPos.y);
    await page.waitForTimeout(2000);
  }

  await page.screenshot({ path: ".pi/temp/test-4-after-all.png" });

  // 检查筛选后的结果
  const after = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="/explore/"]');
    return Array.from(links).slice(0, 5).map(a => a.href.split("?")[0]);
  });
  console.log("[test] 筛选后前5条:");
  after.forEach(h => console.log("  " + h.split("/").pop()));

  // 是否有变化
  const changed = before.some((b, i) => b !== after[i]);
  console.log("[test] 结果是否变化: " + (changed ? "✅ 变了（筛选生效）" : "❌ 没变"));

  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
