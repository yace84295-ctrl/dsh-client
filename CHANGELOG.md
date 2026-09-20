# 更新日志 / Changelog

本文件遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 规范,
本项目版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

无。

---

## [0.3.0] - 2026-09-03

### 新增 (Added)

- **🎬 启动画面 (Splash Screen)** — 双击 .exe 立刻看到 `DeepSeek Harness` 启动画面,带 logo 脉冲动画 + 进度条 + 阶段提示(`初始化 → 启动 dsh → 等待端口 → 就绪`),错误状态显示具体原因。
- **⌨️ 命令面板 (Command Palette, `Ctrl+K` / `Ctrl+Shift+P`)** — VS Code 风格浮层:
  - 模糊搜索匹配命令名 + id
  - 键盘导航:`↑↓` 选择,`Enter` 执行,`Esc` 关闭
  - 13 条内置命令:切换主题 / 截图 / 刷新 dsh / 重启 dsh / 检查更新 / 浏览器打开 / 隐藏窗口 / 最小化 / 打开日志 / 设置路径 / 关于 / 打开命令面板本身 / 完全退出
  - 顶栏新增 🎯 按钮可点开,托盘菜单也可触发
- **ℹ️ 关于对话框 (About Dialog)** — 顶栏 ❓ 按钮 / 托盘菜单 / 命令面板三种入口:
  - 应用版本、Electron / Node / Chrome / 平台
  - dsh 二进制路径(若不存在标 ❌) + 工作目录
  - DEEPSEEK_API_KEY 状态(已设置 / 未设置,key 显示为 `sk-12345…abcd` 形式)
  - GitHub 链接(客户端仓库 + dsh 上游仓库 + LICENSE)
- **📂 自定义 dsh 路径 (Custom Path)** — 启动时检测默认路径,缺失则弹原生对话框让用户选:
  - 用 `dialog.showOpenDialog` 选文件 + 选目录
  - 路径保存到 `userData/dsh-client-settings.json`
  - 顶栏新增 📂 按钮可改路径,"保存并重启 dsh"一键生效
- **📍 窗口位置记忆 (Window Position Memory)** — 关闭时自动存 `windowBounds` + `windowMaximized`,下次启动:
  - 恢复 `x / y / width / height`
  - 恢复最大化状态
  - 多显示器场景:校验 bounds 必须落在至少一块当前连接的 display 内,否则忽略(防止窗口跑到不存在的屏外)
  - resize / move 自动 debounce 保存(400ms)
- **📋 日志查看器 (Log Viewer, `Ctrl+Shift+L`)** — 顶栏 📋 按钮 / 托盘 / 命令面板三种入口:
  - 1000 行环形缓冲(覆盖最早)
  - dsh-client 自身 + dsh 子进程 stdout / stderr 全收集
  - 支持搜索 / 复制全部 / 清空 / 双击行复制
  - 顶栏显示当前行数 / 缓冲大小 / 最后刷新时间
- **🪟 全局快捷键新增 `Ctrl+Shift+L`** — 即使窗口隐藏也能打开日志
- **🔍 日志聚焦快捷键 `Ctrl+F`** — 在日志查看器打开时聚焦搜索框
- **`window.dsh.openExternal(url)`** — 新 IPC 桥,关于对话框用它打开 GitHub 链接
- **`window.dsh.getSettings / setDshPath / pickDshPath / pickDshCwd / getLogs / clearLogs / getAbout`** — 6 个新 IPC 桥

### 修改 (Changed)

- `main.js` 从 ~563 行扩展到 ~860 行(+ ~300),逻辑分层更清晰:settings / log buffer / splash / bounds memory 都拆成独立函数
- `preload.js` 暴露的 `window.dsh.*` API 从 ~17 个扩到 ~26 个
- 顶栏按钮顺序调整:把"高频入口"(命令面板 / 日志 / 路径设置)放在最前
- 托盘菜单增加 "命令面板 / 查看日志 / 关于" 三项
- 右键菜单增加 "命令面板 / 查看日志 / 关于" 三项
- `package.json` 加完整开源元数据:`keywords / author / repository / bugs / homepage / engines / devDependencies / scripts`(lint / format / test / dist / pack)
- `package.json` 的 `build.files` 加入 `splash.html / icon-256.png`,确保打包后启动画面可用
- `package.json` 的 `build.publish` 加 GitHub provider 占位,方便后续开 auto-update

### 修复 (Fixed)

- (无)

### 文件统计 (Stats)

- 源码:`main.js 860 + preload.js 96 + index.html 410 + styles.css 530 + splash.html 110 ≈ 2000 行`
- 打包:`dist/dsh-client-portable-0.3.0.exe`(单文件,~92 MB,免安装)

---

## [0.2.0] - 2026-09-03

### 新增

- 全局快捷键 (`Ctrl+Shift+D / R / Q / S / T`)
- 深色 / 浅色主题切换(`data-theme` + CSS variables),持久化
- 截图工具(`webContents.capturePage` + `dialog.showSaveDialog`)
- 右键快捷菜单(`webContents.on('context-menu')` + `Menu.popup`)
- "检查更新"功能(模拟 stub,真接入 GitHub Releases 通过 `DSH_AUTO_UPDATE=1` 开启)
- `electron-updater@^6.8.9` 加入 dependencies

### 文件统计

- 源码:1049 行
- 打包:`dist/dsh-client-portable-0.2.0.exe` ≈ 92 MB

---

## [0.1.0] - 2026-09-03 初版

- dsh 子进程拉起 + 等待 `localhost:3080` 就绪(60s 超时)
- Frameless BrowserWindow + 自绘 title bar + 自绘控件(─ ▢ ✕)
- iframe 嵌入 `http://127.0.0.1:3080`
- 系统托盘 + 菜单(打开主窗口 / 浏览器打开 / 刷新 / 退出)
- IPC bridge:getVersion / reload / hide / minimize / quit / openInBrowser
- `.env` 读 `DEEPSEEK_API_KEY` 自动注入 dsh 子进程
- 单实例锁
- 加载失败错误页回退 + retry
- 打包:dsh-client-portable-0.1.0.exe (72.7 MB)

---

[Unreleased]: https://github.com/yourname/dsh-client/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/yourname/dsh-client/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/yourname/dsh-client/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/yourname/dsh-client/releases/tag/v0.1.0
