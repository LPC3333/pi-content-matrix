/**
 * 小红书搜索抓取脚本
 * 
 * ⚠️ 核心原则：一切操作应在能完成目标的情况下尽可能模拟人类。
 *    - 点击前先滚动到元素可见位置（人不会点看不到的东西）
 *    - 每次操作间加随机延迟（人不会秒级连点）
 *    - 打开筛选面板用 evaluate dispatchEvent 而非 page.mouse.click（避免坐标偏差）
 *    - 打开详情用 page.mouse.click 点卡片中间（人在页面上基本这么点）
 *    - 检测到验证码/登录提示时停下，不刷新不重试
 *    - scrollBy 用较小步长多次滚动（人不会一下子跳几百像素）
 *
 * 用法: node tools/xhs-search.cjs <账号名> <关键词> <输出路径>
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const EXT_PATH = "C:\\Users\\11141\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Extensions\\bnlffdbcfnanfbknnlaflhlhkocccckg\\1.9.13_0";
const BASE = path.join(__dirname, "..", ".personas");

async function main() {
  const accountName = process.argv[2] || "style-observer";
  const keyword = process.argv[3];
  const outFile = process.argv[4];

  if (!keyword || !outFile) {
    console.error("用法: node tools/xhs-search.cjs <账号名> <关键词> <输出路径>");
    process.exit(1);
  }

  const userDataDir = path.join(BASE, accountName, ".browser-data");
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  // 启动前备份 Cookie，运行期间设为只读，禁止任何操作删除 cookie
  const cookieFile = path.join(userDataDir, "Default", "Cookies");
  const cookieJournal = path.join(userDataDir, "Default", "Cookies-journal");
  let cookieBackup = null;
  let cookieReadonly = false;
  if (fs.existsSync(cookieFile)) {
    cookieBackup = Buffer.from(fs.readFileSync(cookieFile));
    try { fs.chmodSync(cookieFile, 0o444); cookieReadonly = true; } catch {}
    try { fs.chmodSync(cookieJournal, 0o444); } catch {}
    console.log(`[xhs] 🔒 Cookie 已锁定 (${cookieBackup.length} 字节)`);
  }

  // 退出时恢复 cookie
  process.on('exit', () => {
    if (cookieReadonly) {
      try { fs.chmodSync(cookieFile, 0o644); } catch {}
      try { fs.chmodSync(cookieJournal, 0o644); } catch {}
      if (cookieBackup && !fs.existsSync(cookieFile) && fs.existsSync(path.dirname(cookieFile))) {
        fs.writeFileSync(cookieFile, cookieBackup);
      }
    }
  });

  console.log(`[xhs] 启动浏览器 (account: ${accountName})`);

  const browser = await chromium.launchPersistentContext(userDataDir, {
    channel: "msedge", headless: false, viewport: { width: 1440, height: 900 },
    args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`]
  });

  const page = browser.pages()[0] || await browser.newPage();

  // ── 打开搜索 ──
  const url = "https://www.xiaohongshu.com/search_result?keyword=" + encodeURIComponent(keyword);
  console.log(`[xhs] 打开: ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000 + Math.random() * 2000);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1000 + Math.random() * 2000);

  // ── 检测反爬 ──
  async function checkLogin() {
    const body = await page.evaluate(() => document.body.innerText);
    if (['扫码','二维码','请登录','手机号登录','验证码','重新登录'].some(t => body.includes(t))) {
      console.log("[xhs] ⚠️ 需要登录/验证，浏览器保持打开，请扫码后手动关闭并重跑");
      await new Promise(() => {});
    }
  }
  await checkLogin();

  // ── 打开筛选面板 ──
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
    await page.waitForTimeout(1500 + Math.random() * 1500);
  }

  // ── 筛选：图文 ──
  console.log("[xhs] 筛选：图文");
  await openFilter();
  await checkLogin();
  await page.mouse.click(1244, 344);
  await page.waitForTimeout(1000 + Math.random() * 2000);
  await checkLogin();

  // ── 筛选：半年内 ──
  console.log("[xhs] 筛选：半年内");
  await openFilter();
  await checkLogin();
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
  await checkLogin();

  // ── 滚动加载 ──
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(1500 + Math.random() * 1000);
  }

  // ── 抓取列表（标题+链接+点赞+作者）──
  async function grabList() {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    return await page.evaluate(() => {
      const cards = [];
      document.querySelectorAll('section.note-item').forEach(el => {
        const titleEl = el.querySelector('.title, [class*="title"]');
        const authorEl = el.querySelector('.author .name, [class*="author"] .name, .nickname');
        const likeEl = el.querySelector('.like-wrapper .count, [class*="like"] span');
        const link = el.querySelector('a[href*="/explore/"]');
        if (link) {
          cards.push({
            title: titleEl?.textContent?.trim() || '',
            author: authorEl?.textContent?.trim() || '',
            likes: likeEl?.textContent?.trim() || '',
            href: link.href.split('?')[0]
          });
        }
      });
      return cards;
    });
  }

  const list = await grabList();
  console.log(`[xhs] 列表 ${list.length} 条`);

  // ── 逐篇打开详情抓正文+评论（前 N 篇）──
  const DETAIL_COUNT = Math.min(list.length, 20);
  console.log(`[xhs] 开始抓取前 ${DETAIL_COUNT} 篇详情...`);

  for (let i = 0; i < DETAIL_COUNT; i++) {
    // 滚动到第 i 篇笔记的位置（确保在视口内）
    const scrolled = await page.evaluate((idx) => {
      const sections = document.querySelectorAll('section.note-item');
      if (!sections[idx]) return false;
      sections[idx].scrollIntoView({ behavior: 'instant', block: 'center' });
      return true;
    }, i);
    if (!scrolled) continue;
    await page.waitForTimeout(800);

    // 找第 i 篇的 section 坐标并用 page.mouse.click 点击打开浮层
    const coords = await page.evaluate((idx) => {
      const sections = document.querySelectorAll('section.note-item');
      if (!sections[idx]) return null;
      const r = sections[idx].getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return null;
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    }, i);
    if (!coords) continue;
    await page.mouse.click(coords.x, coords.y);
    await page.waitForTimeout(2000 + Math.random() * 1500);
    await checkLogin();

    // 验证浮层是否打开（检查 DOM 里是否出现了详情容器）
    let detailOpened = await page.evaluate(() => {
      return !!(document.querySelector('[class*="note-content"], [class*="note-scroller"], [class*="detail-content"], [class*="feed-detail"], [class*="note-detail"]'));
    });

    // 没打开就重试一次（点标题区域）
    if (!detailOpened) {
      console.log(`[xhs]   ⚠️ 浮层未开，重试...`);
      // 重试前再次滚到该笔记
      await page.evaluate((idx) => {
        const sections = document.querySelectorAll('section.note-item');
        if (sections[idx]) sections[idx].scrollIntoView({ behavior: 'instant', block: 'center' });
      }, i);
      await page.waitForTimeout(500);
      const retryCoords = await page.evaluate((idx) => {
        const sections = document.querySelectorAll('section.note-item');
        if (!sections[idx]) return null;
        // 试标题元素
        const titleEl = sections[idx].querySelector('.title, [class*="title"]');
        const target = titleEl || sections[idx];
        const r = target.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return null;
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      }, i);
      if (retryCoords) {
        await page.mouse.click(retryCoords.x, retryCoords.y);
        await page.waitForTimeout(2000 + Math.random() * 1500);
        detailOpened = await page.evaluate(() => {
          return !!(document.querySelector('[class*="note-content"], [class*="note-scroller"], [class*="detail-content"], [class*="feed-detail"], [class*="note-detail"]'));
        });
      }
    }

    // 抓取浮层内容（如果浮层打开）
    if (detailOpened) {
      // TODO: 评论区抓取暂在开发中，滚动逻辑暂时跳过
      // await page.evaluate(...scrollTo底部+dispatch scroll事件...)
      // 当前只抓正文，评论区字段留空

      const detail = await page.evaluate(() => {
        // 多级选择器降级找正文容器
        const selectors = [
          '[class*="note-content"]',
          '[class*="note-scroller"]',
          '[class*="detail-content"]',
          '[class*="feed-detail"]',
          '[class*="note-detail"]',
          '[id*="detail"]'
        ];
        let container = null;
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el && el.innerText && el.innerText.length > 50) {
            container = el;
            break;
          }
        }

        if (!container) return { noteText: '', comments: '' };

        const fullText = container.innerText || '';
        const commentIdx = fullText.indexOf('评论');
        const noteText = commentIdx > -1 ? fullText.substring(0, commentIdx).trim() : fullText.substring(0, 3000).trim();
        const comments = commentIdx > -1 ? fullText.substring(commentIdx).trim() : '';

        // 排除导航垃圾
        if (noteText.includes('沪ICP备') || noteText.includes('首页\n点点')) {
          return { noteText: '', comments: '' };
        }

        return {
          noteText: noteText.replace(/\n{3,}/g, '\n').trim(),
          comments: comments.replace(/\n{3,}/g, '\n').trim()
        };
      });

      list[i].noteText = detail.noteText;
      list[i].comments = '';  // TODO: 评论区抓取暂未实现
      console.log(`[xhs]   [${i+1}/${DETAIL_COUNT}] ${list[i].title.substring(0,30)} ${detail.noteText ? '✅' : '⚠️空'}`);

      // 关闭浮层
      await page.mouse.click(100, 450);
      await page.waitForTimeout(1000 + Math.random() * 500);
    } else {
      console.log(`[xhs]   [${i+1}/${DETAIL_COUNT}] ${list[i].title.substring(0,30)} ❌浮层未开`);
    }
  }

  // ── 输出 ──
  fs.writeFileSync(outFile, JSON.stringify({ keyword, count: list.length, notes: list }, null, 2), 'utf-8');
  console.log(`[xhs] ✅ ${list.length} 条 → ${outFile}`);
  await browser.close();
}

main().catch(e => { console.error("[xhs]", e.message); process.exit(1); });
