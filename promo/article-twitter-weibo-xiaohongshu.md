---
title: 开源 dsh-client,让 DeepSeek Harness 变成 Windows 原生桌面 app
platform: Twitter/X(英文 thread) / 微博 / 小红书
target_audience: AI 开发者、Agent 爱好者、开源尝鲜党
tags: [DeepSeek, Electron, AIAgent, OpenSource, 开源, 效率工具]
date: 2026-09-03
version: v0.3.1
license: MIT
note: 每条推文均 ≤280 字符,可独立发布;微博每条 ≤140 字
---

# 开源 dsh-client,让 DeepSeek Harness 变成 Windows 原生桌面 app

> 全文 `USER/REPO` 为占位符,发布前请替换成真实仓库路径。

---

## 一、Twitter / X — 7 条 thread(英文,每条 ≤280 字符)

**1/7 — 钩子**

```
DeepSeek open-sourced their agent harness (dsh). It runs `dsh web` and you use it in a browser tab.

I got tired of the terminal window I couldn't close, so I wrapped it in a real Windows desktop app.

Open source, MIT: github.com/yourname/dsh-client
```

**2/7 — 数字**

```
The whole thing:

• ~2 hours of work
• 2.1K lines of code
• 124 Vitest tests, 76.5% coverage
• 1 portable .exe, 92 MB
• 0 dependencies for end users — no Node install needed

Electron 32 + Node 24.
```

**3/7 — 核心功能**

```
What it actually does:

Double-click the .exe → it spawns `dsh web`, polls 127.0.0.1:3080 until ready, shows a splash with progress, then opens the window with dsh embedded.

Close the window → tray. Quit → taskkill /f /t the whole process tree. No orphan node holding port 3080.
```

**4/7 — 快捷键**

```
8 global shortcuts, they work even when the window is hidden:

Ctrl+Shift+D → show / hide
Ctrl+Shift+R → restart the dsh subprocess
Ctrl+Shift+S → screenshot the window
Ctrl+Shift+T → toggle theme
Ctrl+Shift+L → log viewer
Ctrl+Shift+Q → quit (kills dsh)
Ctrl+K → command palette
```

**5/7 — 命令面板 + 日志**

```
Ctrl+K opens a VS Code-style command palette: 13 commands, fuzzy search, arrow keys, Enter.

Ctrl+Shift+L opens a log viewer: 1000-line ring buffer with both dsh-client logs and the dsh subprocess stdout/stderr, searchable.

Debugging a Dev Preview tool needs this.
```

**6/7 — 踩坑**

```
Two things that cost me real time:

1. Don't trust "listening" in the logs for readiness. Poll the port over HTTP — dsh logs it ~300ms before it accepts connections.

2. child.kill() won't kill grandchildren of cmd.exe /c. Use taskkill /pid <pid> /f /t. The /t matters.
```

**7/7 — CTA**

```
It's just a shell — all the AI is upstream in dsh, thanks to the DeepSeek team for open-sourcing it.

MIT licensed. The process manager, global shortcuts and command palette are all standalone modules, steal them freely.

⭐ github.com/yourname/dsh-client
Download: /releases
```

---

## 二、微博 — 2 条(中文,每条 ≤140 字)

**主发**

```
DeepSeek 的 agent 工具 dsh 只能浏览器用,还得常驻一个关不掉的终端。我做了个 Electron 桌面客户端 dsh-client:双击 92MB 免安装 exe 自动拉起 dsh,8 个全局快捷键+命令面板+日志 👉 github.com/yourname/dsh-client
```

**补充(可作评论或第二条)**

```
细节:Electron 32 + Node 24,124 个测试 76.5% 覆盖率,用户不用装 Node。最爽的是 Ctrl+Shift+D 呼之即来、Ctrl+Shift+R 一键重启 dsh。最大的坑:别信日志里的 listening,要轮询端口。
```

---

## 三、小红书 — 图文笔记

**标题(20 字内)**

```
DeepSeek Agent 装进桌面了
```

**正文(约 300 字)**

```
DeepSeek 开源了自家的 agent 工具 dsh,能力真的可以,但用法有点原始:开个终端跑 dsh web,然后去浏览器开 127.0.0.1:3080 😮‍💨

那个终端窗口不能关。我关过一次,dsh 直接死了,还留了个孤儿进程占着端口,重开花了三分钟 🫠

于是自己写了个桌面客户端 dsh-client,已经开源啦 ✨

用起来是这样的 👇
🖱️ 双击一个 92MB 的免安装 exe(不用装 Node!)
🚀 它自己把 dsh 拉起来,启动画面带进度条
⌨️ Ctrl+Shift+D 呼之即来,再按一下收进托盘
🔄 Ctrl+Shift+R 一键重启 dsh,不用关整个 app
🎨 Ctrl+Shift+T 深浅主题一键切,白天晚上都舒服
🔍 Ctrl+K 命令面板,13 条命令模糊搜索
📋 Ctrl+Shift+L 日志查看器,卡住了立刻知道原因
🧹 退出自动清理进程,再没有端口被占

一共 8 个全局快捷键,窗口藏起来也能用 💪

技术栈 Electron 32 + Node 24,124 个测试,MIT 协议,想改想抄都随便 🙌

GitHub 搜 USER/REPO,Releases 里直接下 exe,欢迎来点个 star ⭐
```

**配图建议(4 张)**

1. 主界面浅色主题(全屏,展示玻璃标题栏)
2. 命令面板打开态(`Ctrl+K`,展示 13 条命令的模糊搜索)
3. 深色 / 浅色主题左右对比拼图
4. 快捷键清单做成一张图卡(8 个全局快捷键 + 图标)

**标签(10 个)**

```
#AI工具 #DeepSeek #AIAgent #开源项目 #效率工具 #程序员日常 #Electron #独立开发 #桌面应用 #GitHub
```

---

**GitHub**:https://github.com/yourname/dsh-client(请替换)
**下载**:https://github.com/yourname/dsh-client/releases(请替换)
**License**:MIT
**Stars**:⭐ Star me on GitHub
