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

  // 筛选图文 + 半年内
  async function openFilterPanel() {
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
    await page.waitForTimeout(1500 + Math.random() * 1500);
  }

  console.log("[test] 筛选：图文");
  await openFilterPanel();
  await page.mouse.click(1244, 344);
  await page.waitForTimeout(1000 + Math.random() * 2000);

  console.log("[test] 筛选：半年内");
  await openFilterPanel();
  const hp = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*')).find(e =>
      e.offsetParent && e.textContent.trim() === '半年内' &&
      e.parentElement && e.parentElement.parentElement &&
      e.parentElement.parentElement.textContent.includes('发布时间')
    );
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) };
  });
  await page.mouse.click(hp ? hp.x : 1352, hp ? hp.y : 432);
  await page.waitForTimeout(2000 + Math.random() * 2000);

  // 滚动加载
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(1500 + Math.random() * 1000);
  }

  await page.screenshot({ path: ".pi/temp/test-list-after-filter.png" });

  // 滚动回顶部，确保第一篇笔记可见
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1000);

  // 找第一篇笔记的坐标
  const firstNote = await page.evaluate(() => {
    // 方案1: 第一个 section.note-item
    const section = document.querySelector('section.note-item');
    if (section) {
      const r = section.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        const title = section.querySelector('.title, [class*="title"]')?.textContent?.trim() || '';
        return { title, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      }
    }
    // 方案2: 第一个足够大的 explore 链接
    const links = document.querySelectorAll('a[href*="/explore/"]');
    for (const a of links) {
      const r = a.getBoundingClientRect();
      if (r.width > 100 && r.height > 50) {
        return { href: a.href.split('?')[0], x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      }
    }
    return null;
  });
  console.log("[test] 第一篇笔记: " + JSON.stringify(firstNote));

  if (firstNote) {
    // 点击打开详情
    console.log("[test] click 打开详情...");
    await page.mouse.click(firstNote.x, firstNote.y);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: ".pi/temp/test-detail-open.png" });

    // 抓取正文和评论区
    const detail = await page.evaluate(() => {
      const body = document.body.innerText;
      const noteContent = body.substring(0, 2000);
      // 找"评论"
      const commentIdx = body.indexOf('评论');
      const comments = commentIdx > -1 ? body.substring(commentIdx, commentIdx + 500) : '';
      return { noteContent, comments };
    });
    console.log("[test] 正文前200字: " + detail.noteContent.substring(0, 200));
    console.log("[test] 评论区片段: " + (detail.comments || "(无)"));

    // 关闭详情：点页面左侧空白区域
    console.log("[test] click 空白区域关闭详情...");
    await page.mouse.click(100, 450);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: ".pi/temp/test-detail-closed.png" });

    // 验证是否回到了列表页
    const backToList = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/explore/"]');
      return links.length;
    });
    console.log("[test] 关闭后列表链接数: " + backToList);
  }

  await browser.close();
  console.log("[test] 完成");
}

main().catch(e => { console.error(e.message); process.exit(1); });
