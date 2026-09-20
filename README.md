<div align="center">

# 🧠 DeepSeek Harness Desktop Client

[![Electron](https://img.shields.io/badge/Electron-32-47848F?logo=electron)](https://www.electronjs.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%2F11-0078D6?logo=windows)](https://www.microsoft.com/windows)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Release](https://img.shields.io/badge/Release-v0.3.0-orange)](CHANGELOG.md)
[![Node](https://img.shields.io/badge/Node-%E2%89%A522-339933?logo=node.js)](https://nodejs.org)

**把 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 Web UI 装进一个真正的 Windows 桌面应用 — 单文件便携 .exe,免安装,自启动 dsh 子进程,系统托盘常驻。**

**A single-file Windows desktop wrapper for [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness). Frameless, portable, tray-resident, built on Electron.**

[English](#english) · [中文](#中文) · [Install](#installation--安装) · [Shortcuts](#keyboard-shortcuts--快捷键) · [Build](#building-from-source--从源码构建)

</div>

---

<a id="中文"></a>

## 🇨🇳 中文

### ✨ 功能

- 🚀 **零依赖启动** — 自动 spawn `dsh web` 子进程,等端口 3080 就绪后再开窗口
- 🎬 **启动画面 (Splash)** — 双击 .exe 即看到进度,而不是黑窗闪烁
- ⌨️ **命令面板 (Ctrl+K)** — 类似 VS Code 的模糊搜索命令面板,所有功能一键触达
- ℹ️ **关于对话框** — 版本、Electron / Node / Chrome、dsh 路径、API key 状态一目了然
- 📂 **自定义 dsh 路径** — 默认路径找不到时弹窗让用户选,设置持久化
- 📍 **窗口位置记忆** — 关闭时记住大小/位置/最大化状态,多显示器自动校验
- 📋 **日志查看器 (Ctrl+Shift+L)** — 内置 1000 行环形缓冲,支持搜索 / 复制 / 清空
- 🌗 **深色 / 浅色主题** — 一键切换,主题同步标题栏 chrome
- 📸 **截图 (Ctrl+Shift+S)** — 截整个窗口(含 iframe dsh),自动弹保存对话框
- 🖱️ **右键快捷菜单** — 复制 / 粘贴 / 截图 / 主题 / 重启 dsh
- 🔌 **安全 IPC** — `contextIsolation: true`,只暴露 `window.dsh` 最小 API
- 🚪 **多窗口互斥** — single-instance lock,二次启动会聚焦已有窗口
- 🧹 **进程清理** — 退出时 `taskkill /f /t` 整个 cmd.exe 树
- 🔄 **检查更新** — 内置 stub,接入 GitHub Releases 后即可真用

### 📦 安装

#### 方式一:下载便携 .exe(推荐普通用户)

从 [Releases](../../releases) 页面下载 `dsh-client-portable-X.Y.Z.exe`,双击即用,免安装。

#### 方式二:从源码运行

```cmd
git clone https://github.com/yourname/dsh-client.git
cd dsh-client
npm install
npm start
```

#### 前置依赖

1. **Node.js 22+** — [下载](https://nodejs.org/)
2. **dsh (DeepSeek Harness)** — 通过 `npm i -g deepseek-harness` 安装,或确保 `dsh.cmd` 在路径上
3. **DeepSeek API key** — 在 `%LOCALAPPDATA%\hermes\.env` 写入:
   ```env
   DEEPSEEK_API_KEY=sk-...
   ```

### 🚀 快速开始

启动后会自动:
1. 拉起 dsh 子进程(`cmd /c dsh.cmd web`)
2. 探测 `127.0.0.1:3080` 直到响应
3. 弹出主窗口,把 dsh Web UI 嵌入 iframe
4. 关闭窗口 → 隐藏到托盘(不退出进程)
5. 托盘"退出"→ 真正退出并 `taskkill` dsh

### ⌨️ 快捷键

| 快捷键 | 动作 |
|--------|------|
| `Ctrl+K` / `Ctrl+Shift+P` | 打开命令面板 |
| `Ctrl+Shift+L` | 打开日志查看器 |
| `Ctrl+Shift+D` | 显示/隐藏主窗口 |
| `Ctrl+Shift+R` | 重启 dsh 子进程 + 刷新窗口 |
| `Ctrl+Shift+S` | 截图整个窗口到 PNG |
| `Ctrl+Shift+T` | 切换深色 / 浅色主题 |
| `Ctrl+Shift+Q` | 完全退出(含 dsh) |
| `Ctrl+R` | 仅刷新 dsh Web UI |
| `Ctrl+F` | 在日志查看器内聚焦搜索 |
| `Esc` | 关闭顶层模态框 |

### ⚙️ 配置

启动时会读取 `userData/dsh-client-settings.json`(Windows: `%APPDATA%\dsh-client\`):

```json
{
  "theme": "dark",
  "dshBin": "C:/Users/111/dsh-scratch/node_modules/.bin/dsh.cmd",
  "dshCwd": "C:/Users/111/dsh-scratch",
  "windowBounds": { "x": 200, "y": 100, "width": 1400, "height": 900 },
  "windowMaximized": false
}
```

也支持用环境变量覆盖(便于便携):

```cmd
set DSH_BIN=D:\apps\dsh\bin\dsh.cmd
set DSH_CWD=D:\apps\dsh
set DSH_ENV_FILE=D:\secrets\.env
npm start
```

### ❓ 故障排查

- **"找不到 dsh: C:/Users/..."** → 启动时会自动弹窗让你手动选 `dsh.cmd` 路径
- **端口 3080 已被占用** → `taskkill /f /im node.exe /fi "WINDOWTITLE eq dsh*"`,然后重启
- **DEEPSEEK_API_KEY 未找到** → 检查 `%LOCALAPPDATA%\hermes\.env` 是否存在并含 `DEEPSEEK_API_KEY=...`
- **npm install 卡住** → 设 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` 后重试

---

<a id="english"></a>

## 🇬🇧 English

### ✨ Features

- 🚀 **Zero-config boot** — auto-spawns `dsh web`, waits for port 3080, then shows the window
- 🎬 **Splash screen** — progress feedback instead of a blank dark window
- ⌨️ **Command palette (`Ctrl+K`)** — VS Code-style fuzzy-search launcher for every action
- ℹ️ **About dialog** — versions, paths, API key status at a glance
- 📂 **Custom dsh path** — detected at startup, user can pick via native dialog, persisted
- 📍 **Window position memory** — size/position/maximized state restored next launch (multi-monitor safe)
- 📋 **Log viewer (`Ctrl+Shift+L`)** — 1000-line ring buffer with search / copy / clear
- 🌗 **Dark / light theme** — toggle, persisted, OS chrome follows
- 📸 **Screenshot (`Ctrl+Shift+S`)** — capture the entire window (including the dsh iframe)
- 🖱️ **Right-click menu** — copy / paste / screenshot / theme / restart dsh
- 🔌 **Sandboxed IPC** — `contextIsolation: true`, minimal `window.dsh` bridge
- 🚪 **Single-instance lock** — second launch focuses existing window
- 🧹 **Process cleanup** — `taskkill /f /t` on the whole cmd.exe tree on exit
- 🔄 **Update check stub** — drop in GitHub Releases + token to enable real auto-update

### 📦 Install

#### Option 1 — Portable .exe (recommended for most users)

Grab `dsh-client-portable-X.Y.Z.exe` from [Releases](../../releases) and double-click. No installer, no admin rights required.

#### Option 2 — From source

```bash
git clone https://github.com/yourname/dsh-client.git
cd dsh-client
npm install
npm start
```

#### Prerequisites

1. **Node.js 22+** — [download](https://nodejs.org/)
2. **dsh (DeepSeek Harness)** — `npm i -g deepseek-harness`, or make sure `dsh.cmd` is on `PATH`
3. **DeepSeek API key** — write `%LOCALAPPDATA%\hermes\.env`:
   ```env
   DEEPSEEK_API_KEY=sk-...
   ```

### 🚀 Quick start

On launch the client will:
1. Spawn the dsh child process (`cmd /c dsh.cmd web`)
2. Poll `127.0.0.1:3080` until it responds
3. Open the main window with dsh Web UI embedded in an iframe
4. Closing the window → hides to tray (process keeps running)
5. Tray → "Quit" → really exits and `taskkill`s dsh

### ⌨️ Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Ctrl+Shift+P` | Open command palette |
| `Ctrl+Shift+L` | Open log viewer |
| `Ctrl+Shift+D` | Show / hide main window |
| `Ctrl+Shift+R` | Restart dsh + reload window |
| `Ctrl+Shift+S` | Screenshot to PNG |
| `Ctrl+Shift+T` | Toggle theme |
| `Ctrl+Shift+Q` | Fully quit (kills dsh) |
| `Ctrl+R` | Reload dsh Web UI only |
| `Ctrl+F` | Focus log search |
| `Esc` | Close topmost modal |

### ⚙️ Configuration

Reads `userData/dsh-client-settings.json` on launch (Windows: `%APPDATA%\dsh-client\`):

```json
{
  "theme": "dark",
  "dshBin": "C:/Users/111/dsh-scratch/node_modules/.bin/dsh.cmd",
  "dshCwd": "C:/Users/111/dsh-scratch",
  "windowBounds": { "x": 200, "y": 100, "width": 1400, "height": 900 },
  "windowMaximized": false
}
```

Environment overrides are also supported:

```cmd
set DSH_BIN=D:\apps\dsh\bin\dsh.cmd
set DSH_CWD=D:\apps\dsh
set DSH_ENV_FILE=D:\secrets\.env
npm start
```

### 🏗 Building from source

```cmd
npm install
npm run build:portable
```

Output: `dist\dsh-client-portable-X.Y.Z.exe` (~92 MB single-file, no install required).

CI builds on Windows-latest via GitHub Actions — see [`.github/workflows/build.yml`](.github/workflows/build.yml).

### 📂 Project structure

```
dsh-client/
├── main.js              # Main process: spawn dsh, window, tray, IPC
├── preload.js           # Secure IPC bridge → window.dsh
├── index.html           # Custom shell UI (title bar + iframe + modals)
├── styles.css           # Theme variables + palette / modal styles
├── splash.html          # v0.3.0 — splash screen with progress
├── package.json         # Electron + electron-builder config
├── build.bat            # Windows one-click build script
├── LICENSE              # MIT
├── CHANGELOG.md         # Release history
└── docs/
    ├── architecture.md
    ├── keyboard-shortcuts.md
    └── development.md
```

### 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports and PRs welcome on [Issues](../../issues).

### 📜 License

[MIT](LICENSE) © 2026 dsh-client contributors.

### 🙏 Acknowledgements

- [DeepSeek AI](https://www.deepseek.com/) — for the underlying dsh harness
- [Electron](https://www.electronjs.org/) — for the runtime
- [electron-builder](https://www.electron.build/) — for the single-file portable packaging
- All contributors who file issues, send PRs, and spread the word
