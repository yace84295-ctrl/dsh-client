# 更新日志 / Changelog

本文件遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 规范,
本项目版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

### 修复 (Fixed)

- 启动 dsh 时不再额外拉起系统默认浏览器:给 `dsh web` 传 `--no-open`,桌面客户端旁不再多出一个重复标签页
- dsh 启动失败时,「启动失败」页面不再被 `index.html` 立即覆盖,失败原因与「重试」按钮现在真的看得见
- 错误页的「重试」按钮此前只重刷静态页面(`location.reload()`),现在改走 IPC 真正重启 dsh 子进程

### 修改 (Changed)

-`npm run syntax-check` 从 POSIX 的 `for f in src/*.js` 循环改为跨平台脚本 `scripts/syntax-check.mjs`,修复 Windows(npm 默认 cmd.exe)下必然失败的问题
- dsh 路径不再写死本机目录:默认值改为自动探测(npm 全局 shim → PATH → `~/dsh-scratch`),探测不到时提示去设置里指定;README 配置示例同步去掉个人路径
- API key 的 env 文件位置改为 dsh-client 自己的配置目录 `%APPDATA%\dsh-client\.env`(可用 `DSH_ENV_FILE` 覆盖),不再指引用户写进 Hermes 的 `.env`;旧路径仍作为回退读取
- 仓库链接占位符全部替换为真实路径 `yace84295-ctrl/dsh-client`;移除 README / CHANGELOG 顶部的发布前占位符警告区块与推广文里的替换提示

---

## [0.3.1] - 2026-09-03 — Final prep for open-source

### 新增 (Added)

- **🧩 模块化重构** — 把单文件 `main.js`(860 行)拆成 8 个可测试模块 + 薄 `main.js` 总装(`src/` 模块自身再由清晰的 JSDoc 总览):
  - `src/commands.js` — 命令面板 13 条命令注册表(序列化 opcode,渲染层翻 IPC)
  - `src/dsh-manager.js` — dsh 子进程生命周期(spawn / ready-poll / restart / kill-tree)
  - `src/dsh-path.js` — dsh 路径解析 + DEEPSEEK_API_KEY 遮蔽
  - `src/ipc-handlers.js` — 26 个 IPC 桥,统一 `handle/handleSafe` 注册
  - `src/logger.js` — 1000 行环形缓冲 + stdout/stderr 收集
  - `src/settings.js` — 路径 / 主题 / 窗口位置 / dsh 二进制路径持久化
  - `src/shortcuts.js` — 全局快捷键注册 + 冲突处理
  - `src/splash.js` — 启动画面阶段提示
  - `src/window-state.js` — 多显示器安全的窗口位置记忆
- **🧪 Vitest 测试套件** — 124 个测试,9 个 spec 文件,76.5% 行覆盖率(`coverage/lcov.info`):
  - `commands.spec.js`、`dsh-manager.spec.js`、`dsh-path.spec.js`、`ipc-handlers.spec.js`、`logger.spec.js`、`settings.spec.js`、`shortcuts.spec.js`、`splash.spec.js`、`window-state.spec.js`
- **📸 截图资料** — `docs/screenshots/` 下 4 张演示图(浅色主界面 / 深色主界面 / 命令面板 / 关于对话框)
- **🤖 GitHub Actions** — 3 个工作流(`.github/workflows/`):
  - `test.yml` — vitest 跑测(被 build/lint 复用)
  - `build.yml` — Windows-latest 跑 lint + test + portable 打包,产物上传 14 天
  - `lint.yml` — 单独 lint 任务
  - `release.yml` — tag 触发构建并 `softprops/action-gh-release@v2` 发 draft release
- **📝 Issue / PR 模板** — `.github/ISSUE_TEMPLATE/`:`bug_report.md` / `feature_request.md` / `question.md`
- **📜 PR 模板** — `.github/PULL_REQUEST_TEMPLATE.md`
- **📰 推广文合集** — `promo/` 3 篇:
  - `article-v2ex-juejin.md`(~2300 字,技术深度 + 踩坑)
  - `article-zhihu-wechat.md`(~2900 字,故事 + 行业观察)
  - `article-twitter-weibo-xiaohongshu.md`(7 条推 + 2 条微博 + 1 篇小红书笔记)
- **📚 文档套件** — `docs/`:
  - `architecture.md` — 模块拓扑、数据流、依赖图
  - `development.md` — 本地开发、调试、热重载
  - `keyboard-shortcuts.md` — 9 个快捷键完整说明
  - `screenshot-script.js` — Playwright 截图脚本
- **⚙️ 工程化配置** — `.editorconfig`、`.prettierrc.json`、`.prettierignore`、`eslint.config.js`、`vitest.config.js`、`.gitattributes`
- **📦 发布辅助** — `GITHUB_SETUP.md`、`RELEASE_READY.md`、`RELEASE_CHECKLIST.md`、`GITHUB_PUBLISH_GUIDE.md`、`CHANGELOG_VERSION.md`
- **🤝 社区文件** — `LICENSE`(MIT)、`CONTRIBUTING.md`、`SECURITY.md`、`CODE_OF_CONDUCT.md`

### 修改 (Changed)

- `main.js` 从 860 行拆为 544 行总装(剩余逻辑全部下沉 `src/`),可测性大幅提升
- `preload.js` 维持 26 个 `window.dsh.*` API 不变,确保 `index.html` 无需改
- `package.json` 补全 npm 元数据:`author.email`、`contributors`、`funding`、`license-file`、`engines.npm`、`os: ["win32"]`、`cpu: ["x64"]`、`private: false`、`publishConfig.access: "public"`、新增 keywords(`ai-agent` / `command-palette` / `open-source`)
- README 顶部加 ⚠️ 占位符警告区块 + 文件级影响清单

### 修复 (Fixed)

- `makeSaver`:`win.isDestroyed()` 运算符优先级坑(避免对已销毁窗口调用)
- `fuzzyScore`:id 完全匹配 + 单词起始位额外加权
- CSS:`.modal { display: flex }` 在某些场景下覆盖了 `[hidden]` 属性,改为只在可见态强制 flex

### 文件统计 (Stats)

- 源码:`main.js 544 + preload.js 96 + src/*.js 904 + index.html 410 + styles.css 530 + splash.html 110 ≈ 2600 行`
- 测试:`tests/*.spec.js 124 个用例 / 9 个文件 / 76.5% 行覆盖率`
- 打包:`dist/dsh-client-portable-0.3.1.exe`(单文件,~92 MB,免安装)

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

[Unreleased]: https://github.com/yace84295-ctrl/dsh-client/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/yace84295-ctrl/dsh-client/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/yace84295-ctrl/dsh-client/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/yace84295-ctrl/dsh-client/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/yace84295-ctrl/dsh-client/releases/tag/v0.1.0
