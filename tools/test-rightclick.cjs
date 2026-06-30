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
  await page.waitForTimeout(5000 + Math.random() * 2000);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1000);

  // 筛选图文
  async function openFilter() {
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
    await page.waitForTimeout(1500);
  }

  console.log("[test] 筛选：图文");
  await openFilter();
  await page.mouse.click(1244, 344);
  await page.waitForTimeout(1500);

  console.log("[test] 筛选：半年内");
  await openFilter();
  await page.mouse.click(1352, 432);
  await page.waitForTimeout(2500);

  // 滚动到顶部，取第一篇 section 坐标
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  const coords = await page.evaluate(() => {
    const sections = document.querySelectorAll('section.note-item');
    if (!sections[0]) return null;
    const r = sections[0].getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height * 0.3) };
  });
  console.log("[test] 第一篇坐标: " + JSON.stringify(coords));

  // 右键点击
  console.log("[test] 右键点击...");
  await page.mouse.click(coords.x, coords.y, { button: "right" });
  await page.waitForTimeout(1500);

  await page.screenshot({ path: ".pi/temp/test-rightclick-menu.png" });

  await page.screenshot({ path: ".pi/temp/test-rightclick-menu.png" });

  // 右键菜单弹出后，模拟人类键盘操作：Tab → Enter
  console.log("[test] Tab + Enter 打开新标签页...");
  // 完整模拟按键
  await page.keyboard.down("Tab");
  await page.waitForTimeout(100);
  await page.keyboard.up("Tab");
  await page.waitForTimeout(500);
  await page.keyboard.down("Enter");
  await page.waitForTimeout(100);
  await page.keyboard.up("Enter");
  await page.waitForTimeout(4000 + Math.random() * 2000);

  const pages = browser.pages();
  console.log("[test] 当前标签数: " + pages.length);

  if (pages.length > 1) {
    console.log("[test] 新标签页已打开，浏览器保持运行供你检查");
    await new Promise(() => {});  // 永不退出
  } else {
    console.log("[test] 没有新标签页，浏览器保持运行供你检查");
    await new Promise(() => {});  // 永不退出
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
