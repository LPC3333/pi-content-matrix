# 多账号浏览器管理工具

通过 Playwright + Edge channel + Kimi WebBridge 扩展实现多账号 cookie 隔离，
同时享受 Kimi WebBridge 的无障碍树操作能力（snapshot/fill/click/navigate）。

## 原理

```
Playwright launchPersistentContext
  channel: "msedge"                    ← 使用本机 Edge，扩展天然可用
  userDataDir: .personas/{账号}/.browser-data/  ← 每个账号独立浏览器 profile
  args: --load-extension=kimi-webbridge          ← 注入扩展

→ 浏览器启动，扩展自动连接本地 daemon (:10086)
→ 所有 Kimi WebBridge API 可用
→ 每个账号的 cookie 独立持久化，互不干扰
→ 同一个 daemon，同一个 API endpoint，不管哪个浏览器实例
```

## 已验证

| 测试项 | 结果 |
|--------|------|
| 不同 userDataDir 的 cookie 是否隔离 | ✅ 账号A web_session ≠ 账号B web_session |
| 关闭再打开是否保持登录 | ✅ 账号A 两次 web_session 完全一致 |
| 扩展是否自动连接 daemon | ✅ extension_connected: true |
| snapshot 是否可用 | ✅ 返回完整无障碍树 |
| navigate 是否可用 | ✅ 在 Playwright 浏览器中打开新 tab |

## Kimi WebBridge 扩展信息

- 扩展 ID: `bnlffdbcfnanfbknnlaflhlhkocccckg`
- 安装路径: `C:\Users\11141\AppData\Local\Microsoft\Edge\User Data\Default\Extensions\bnlffdbcfnanfbknnlaflhlhkocccckg\1.9.13_0`
- daemon 端口: `127.0.0.1:10086`

## 使用方式

### 启动浏览器（指定账号）

```bash
node tools/publisher/launch-browser.cjs <账号名>
```

浏览器窗口会打开，可手动操作。关闭窗口或 Ctrl+C 退出。

### 启动浏览器 + 自动检测登录状态

```bash
node tools/publisher/check-login.cjs <账号名>
```

如果未登录，脚本会等待 30 秒供手动扫码/密码登录，超时后自动关闭。

### 在 agent 中使用

agent 通过 bash 调用这两个脚本。kimi-webbridge 的 HTTP API 在所有浏览器实例间
共享同一个 daemon，因此 agent 可以继续用 kimi-webbridge skill 的 navigate/snapshot/fill/click。

## 注意事项

- 首次使用某账号时，`.browser-data/` 目录会被自动创建
- 需要在浏览器中手动登录一次小红书（cookie 会被持久化）
- daemon 必须在启动前已运行：`kimi-webbridge start`
- 扩展版本号可能会随升级变化，需同步更新脚本中的 EXT_PATH
