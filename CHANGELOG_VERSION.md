# dsh-client v0.3.1 — Release Notes

> **发布日**:2026-09-03
> **下载**:`dsh-client-portable-0.3.1.exe`(~92 MB,Windows 10/11 x64,免安装)
> **License**:MIT
> **测试覆盖**:124 个用例 / 9 文件 / 76.5% 行覆盖率

---

## ✨ 这是什么

`dsh-client` 是 [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness) 的 Electron 桌面壳:
双击一个 92 MB 的便携 `.exe`,它会自己拉起 dsh Web 服务、等待端口 3080 就绪、开窗口、把 dsh 的 Web UI 嵌进 iframe,
关闭时收托盘、退出时 `taskkill` 整个进程树。

桌面化零依赖,目标用户是「不想为了用 dsh 一直开着一个关不掉的 cmd 窗口」的开发者。

---

## 🆕 v0.3.1 新增

### 🧩 模块化重构

| 模块 | 职责 |
|------|------|
| `src/commands.js` | 命令面板 13 条命令注册表(序列化 opcode,渲染层翻 IPC) |
| `src/dsh-manager.js` | dsh 子进程生命周期(spawn / ready-poll / restart / kill-tree) |
| `src/dsh-path.js` | dsh 路径解析 + DEEPSEEK_API_KEY 遮蔽 |
| `src/ipc-handlers.js` | 26 个 IPC 桥,统一 `handle/handleSafe` 注册 |
| `src/logger.js` | 1000 行环形缓冲 + stdout/stderr 收集 |
| `src/settings.js` | 路径 / 主题 / 窗口位置 / dsh 二进制路径持久化 |
| `src/shortcuts.js` | 全局快捷键注册 + 冲突处理 |
| `src/splash.js` | 启动画面阶段提示 |
| `src/window-state.js` | 多显示器安全的窗口位置记忆 |

`main.js` 从 860 行降到 544 行总装,所有逻辑下沉 `src/` 模块,导入即可测,不再依赖 Electron runtime。

### 🧪 Vitest 测试套件

- **124 个测试**,9 个 spec 文件
- **76.5% 行覆盖率**(v8 provider)
- 跑测:`npm test` / 监听:`npm run test:watch` / 覆盖率:`npm run test:coverage`

### 🤖 GitHub Actions

- `build.yml` — push 到 main 触发,Windows-latest 跑 lint + test + portable 打包,产物上传 14 天
- `lint.yml` — 单独 lint 任务
- `release.yml` — tag 触发构建并 `softprops/action-gh-release@v2` 发 draft release

### 📚 文档

- `docs/architecture.md` — 模块拓扑与数据流
- `docs/development.md` — 本地开发、调试、热重载
- `docs/keyboard-shortcuts.md` — 9 个快捷键完整说明
- `docs/screenshots/` — 4 张演示截图
- `promo/` — 3 篇推广文(V2EX/掘金 / 知乎/公众号 / Twitter/微博/小红书)

### ⚙️ 工程化

- `.editorconfig`、`.prettierrc.json`、`eslint.config.js`、`vitest.config.js`、`.gitattributes`
- Issue 模板:`bug_report.md` / `feature_request.md` / `question.md`
- PR 模板
- `LICENSE`(MIT)、`CONTRIBUTING.md`、`SECURITY.md`、`CODE_OF_CONDUCT.md`

---

## 📋 沿用自 v0.3.0 的功能

- 🚀 **零依赖启动** — 自动 spawn `dsh web`,等 3080 端口就绪后再开窗口
- 🎬 **启动画面 (Splash)** — 双击 .exe 立刻看到进度,带 logo 脉冲 + 阶段提示
- ⌨️ **命令面板 (Ctrl+K / Ctrl+Shift+P)** — VS Code 风格,模糊搜索 13 条命令
- ℹ️ **关于对话框** — 版本、Electron/Node/Chrome、dsh 路径、API key 状态、GitHub 链接
- 📂 **自定义 dsh 路径** — 启动时检测,缺失则弹原生对话框让用户选
- 📍 **窗口位置记忆** — 多显示器安全(校验 bounds 落在真实存在的屏幕上)
- 📋 **日志查看器 (Ctrl+Shift+L)** — 1000 行环形缓冲 + 搜索 / 复制 / 清空
- 🌗 **深色 / 浅色主题** — 一键切换,标题栏 chrome 跟随
- 📸 **截图 (Ctrl+Shift+S)** — 截整个窗口(含 iframe dsh)
- 🖱️ **右键菜单** — 复制 / 粘贴 / 截图 / 主题 / 重启 dsh / 命令面板 / 日志 / 关于
- 🔌 **安全 IPC** — `contextIsolation: true`,只暴露 `window.dsh` 26 个最小 API
- 🚪 **多窗口互斥** — single-instance lock,二次启动聚焦已有窗口
- 🧹 **进程清理** — 退出时 `taskkill /f /t` 整个 cmd.exe 树

---

## 🐛 v0.3.1 修复

- `makeSaver`:`win.isDestroyed()` 运算符优先级坑(避免对已销毁窗口调用)
- `fuzzyScore`:id 完全匹配 + 单词起始位额外加权
- CSS:`.modal { display: flex }` 在某些场景下覆盖了 `[hidden]` 属性

---

## ⌨️ 完整快捷键

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

---

## 📦 安装

### 普通用户

1. 下载 `dsh-client-portable-0.3.1.exe`(92 MB)
2. 双击 → 第一次启动会弹窗让你选 `dsh.cmd` 路径 → 自动跑
3. Windows Defender 第一次会有「未知发布者」警告 → 「仍要运行」即可(代码全 MIT 开源)

### 开发者

```bash
git clone https://github.com/yace84295-ctrl/dsh-client.git
cd dsh-client
npm install
npm start           # 开发运行
npm test            # 跑测
npm run build:portable   # 打包便携 .exe
```

### 前置依赖

- Windows 10/11 x64
- Node.js 22+(仅源码开发需要)
- dsh:`npm i -g deepseek-harness`
- DeepSeek API key:写入 `%LOCALAPPDATA%\hermes\.env`
  ```env
  DEEPSEEK_API_KEY=sk-...
  ```

---

## ⚠️ 已知限制

- **仅 Windows 10/11 x64** — 进程树清理用 `taskkill`;macOS/Linux 在 roadmap,要改成进程组方案
- **auto-update 是 stub** — `package.json` 已配 `build.publish` + `electron-updater`,正式启用需配 GitHub token
- **92 MB 体积** — Electron runtime + Chromium,换来终端用户零依赖(Node 不装)

---

## 🙏 致谢

- [DeepSeek AI](https://www.deepseek.com/) — dsh 上游
- [Electron](https://www.electronjs.org/) — 桌面运行时
- [electron-builder](https://www.electron.build/) — 单文件便携打包
- 所有提 issue、PR、star、转发的人

---

**License**:MIT © 2026 dsh-client contributors