const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const EXT_PATH = "C:\\Users\\11141\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Extensions\\bnlffdbcfnanfbknnlaflhlhkocccckg\\1.9.13_0";
const BASE = path.join(__dirname, "..", ".personas");

async function main() {
  const userDataDir = path.join(BASE, "persona-bootstrap", ".browser-data");
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

  const page = browser.pages()[0] || await browser.newPage();

  console.log("[test] 搜索 桌面收纳...");
  await page.goto("https://www.xiaohongshu.com/search_result?keyword=" + encodeURIComponent("桌面收纳"), {
    waitUntil: "domcontentloaded", timeout: 30000
  });
  await page.waitForTimeout(5000);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(1000);

  // ===== 用 evaluate dispatch MouseEvent 打开筛选面板 =====
  console.log("[test] evaluate 打开筛选面板...");
  const filterOpened = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*')).find(e =>
      e.offsetParent && e.textContent.trim() === '筛选' &&
      (e.tagName === 'SPAN' || e.tagName === 'DIV')
    );
    if (!el) return "not found";
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new MouseEvent('click', {
      bubbles: true, cancelable: true, clientX: r.left + r.width/2, clientY: r.top + r.height/2
    }));
    return "opened at " + Math.round(r.left + r.width/2) + "," + Math.round(r.top + r.height/2);
  });
  console.log("[test] 筛选面板: " + filterOpened);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: ".pi/temp/test-2-filter-open.png" });

  // ===== 用 page.mouse.click 坐标点半年内 =====
  // 先拿到半年内的坐标
  const halfYearCoords = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*')).find(e =>
      e.offsetParent && e.textContent.trim() === '半年内' &&
      e.parentElement && e.parentElement.parentElement &&
      e.parentElement.parentElement.textContent.includes('发布时间')
    );
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) };
  });

  if (halfYearCoords) {
    console.log(`[test] 半年内坐标: (${halfYearCoords.x}, ${halfYearCoords.y})`);

    // 尝试1: page.mouse.click（单次 click）
    await page.mouse.click(halfYearCoords.x, halfYearCoords.y);
    await page.waitForTimeout(500);

    // 尝试2: mousedown + mouseup 分开
    await page.mouse.move(halfYearCoords.x, halfYearCoords.y);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(1000);

    // 尝试3: 点父容器（.tag-container）
    const parentCoords = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('*')).find(e =>
        e.offsetParent && e.textContent.trim() === '半年内'
      );
      if (!el || !el.parentElement) return null;
      const r = el.parentElement.getBoundingClientRect();
      return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) };
    });
    if (parentCoords) {
      console.log(`[test] 父容器坐标: (${parentCoords.x}, ${parentCoords.y})`);
      await page.mouse.click(parentCoords.x, parentCoords.y);
      await page.waitForTimeout(500);
      await page.mouse.move(parentCoords.x, parentCoords.y);
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: ".pi/temp/test-3-halfyear.png" });

    // 检查选中状态
    const state = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('*')).find(e =>
        e.offsetParent && e.textContent.trim() === '半年内'
      );
      if (!el) return "NOT FOUND";
      return JSON.stringify({
        color: getComputedStyle(el).color,
        fontWeight: getComputedStyle(el).fontWeight,
        className: el.className?.substring?.(0, 80) || ''
      });
    });
    console.log("[test] 半年内状态: " + state);
  } else {
    console.log("[test] 半年内 未找到，筛选面板可能没打开或定位不对");
    // 降级：直接找页面上所有可见的"半年内"
    const allHalf = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*'))
        .filter(e => e.textContent.trim() === '半年内' && e.offsetParent)
        .map(e => {
          const r = e.getBoundingClientRect();
          return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), parentText: e.parentElement?.textContent?.trim()?.substring(0, 40) };
        });
    });
    console.log("[test] 页面上所有 半年内:", JSON.stringify(allHalf, null, 2));
      
    if (allHalf.length > 0) {
      const first = allHalf[0];
      console.log(`[test] 尝试点击第一个半年内 (${first.x}, ${first.y})`);
      await page.mouse.click(first.x, first.y);
      await page.waitForTimeout(2000);
      await page.screenshot({ path: ".pi/temp/test-3-halfyear.png" });
    }
  }

  await browser.close();
  console.log("[test] 完成");
}

main().catch(e => { console.error(e.message); process.exit(1); });
