# 工具泛化解释

> 每个工具不只是它表面在做的事。以下是每段代码的**可复用骨架**。

---

## 1. `launch-browser.cjs` → **启动带登录态的 Playwright 浏览器**

表面功能：启动一个浏览器窗口给用户手动操作。

可复用骨架：
```
chromium.launchPersistentContext(userDataDir, {
  channel: "msedge",
  headless: false,
  viewport: { width: 1440, height: 900 },
  args: [加载扩展]
})
→ 拿到 browser 对象
→ browser.pages()[0] 或 browser.newPage() 拿到 page
→ page 可以做任何 Playwright 操作 (goto / mouse.click / evaluate / screenshot)
→ browser.close() 关闭
```

泛化：**任何需要在已登录状态下操作小红书的脚本，都可以复制这段骨架，然后在 `page` 上追加自己的操作**。cookie 由 `userDataDir` 自动持久化。扩展注入让 Kimi WebBridge 在同一个浏览器里也能用。

---

## 2. `check-login.cjs` → **检测某个账号的 cookie 是否有效**

表面功能：打开浏览器检查登录状态，未登录等 30 秒。

可复用骨架：
```
launchPersistentContext(该账号的 .browser-data)
→ 用 kimi-webbridge API (curl) navigate 到小红书首页
→ snapshot 检查页面内容是否含"手机号登录"
→ browser.close()
```

泛化：**任何需要确认"当前 cookie 能不能用"的场景，都可以用 `curl navigate + snapshot + 搜索"手机号登录"` 这三步来判断**，不关浏览器持续等用户登录是附加功能。

---

## 3. `test-cookie.cjs` / `test-cookie-v2.cjs` → **验证 cookie 隔离正确性**

表面功能：验证两个账号的 cookie 互不干扰。

可复用骨架：同上（launch + navigate + snapshot + 检查登录状态），区别是**连续启动两个不同 userDataDir 的浏览器**来对比。

泛化：**多账号并存时，验证隔离性的测试框架**。可以用来测任何多账号场景。

---

## 4. `test-switch.cjs` → **验证切换账号时浏览器不会冲突**

表面功能：先关账号A的浏览器再开账号B的，确认扩展重新连接。

可复用骨架：同上，但加了 `browser.close()` → 等 3 秒 → 重新 `launchPersistentContext(另一个 userDataDir)`。

泛化：**账号切换的操作流程模板**。关键发现：同一个 `launchPersistentContext` 不能同时跑两个（user data 被锁），必须先关再开。

---

## 5. `test-webbridge.cjs` → **验证 Playwright 浏览器里 Kimi WebBridge 是否可用**

表面功能：检查扩展注入状态。

可复用骨架：
```
launchPersistentContext(带扩展)
→ page.goto("https://www.baidu.com")   // 先验证浏览器本身能访问
→ page.goto("https://www.xiaohongshu.com/explore")
→ page.evaluate(() => !!window.__kimi_webbridge)  // 检查扩展注入
```

泛化：**任何需要确认"Playwright 启动的浏览器里 WebBridge 能不能用"的场景的验证脚本**。也证明了 → Playwright 启动带扩展的浏览器 → Kimi WebBridge API 可以从外部 curl 操作这个浏览器的 tab。

---

## 6. `xhs-search.cjs` → **Playwright 自动化：搜索 → 筛选半年内 → 抓取结果列表**

表面功能：搜一个关键词，筛半年内，把标题和链接写入 JSON。

可复用骨架：
```
launchPersistentContext(带登录 cookie 的 userDataDir)
→ page.goto("搜索URL")
→ page.keyboard.press("Escape")  // 关弹窗
→ page.mouse.click(x, y)        // 点筛选 ← Playwright 原生坐标点击
→ page.mouse.click(x, y)        // 点"半年内"
→ page.evaluate(() => window.scrollBy(...))  // 滚动加载
→ page.evaluate(() => document.querySelectorAll(...))  // 抓取 DOM
→ fs.writeFileSync(输出文件)
→ browser.close()
```

泛化：**任何"打开小红书 → 操作 UI → 抓取数据"的模板**。关键点：
- `page.mouse.click(x, y)` 是 Playwright 的原生坐标点击，小红书不会反爬
- 抓取逻辑用 `page.evaluate` 在页面内执行 JS 提取 DOM
- 可以改成 search 后抓取详情页（navigate 到每条笔记的 URL，snapshot/evaluate 抓正文+评论）
