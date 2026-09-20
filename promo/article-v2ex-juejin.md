---
title: 用 Electron 给 DeepSeek Harness 做了个桌面客户端:从 0 到开源的 2 小时
platform: V2EX(创造者节点) / 掘金(AI、开源、Electron 标签)
target_audience: AI 开发者、Electron/Node 开发者、Agent 折腾党
tags: [DeepSeek, DeepSeek-Harness, Electron, Agent, 开源, Windows]
date: 2026-09-03
version: v0.3.1
license: MIT
---

# 用 Electron 给 DeepSeek Harness 做了个桌面客户端:从 0 到开源的 2 小时

DeepSeek 开源了自家的 agent harness(`dsh`,目前 Dev Preview 阶段),跑起来是 `dsh web`,然后你去浏览器开 `127.0.0.1:3080`。

能用,但用久了就烦:

- 一个终端窗口常驻,不能关,关了 dsh 就死;
- 浏览器里它就是第 17 个标签页,和微博、文档、掘金混在一起,`Ctrl+Tab` 找半天;
- 想快速唤起?没有全局快捷键,得先找浏览器窗口,再找标签页;
- 关浏览器不会 kill dsh,进程留在后台,下次启动端口 3080 被占,`EADDRINUSE`。

所以我花了个把小时写了 `dsh-client`:一个 Electron 桌面壳,双击一个 92 MB 的 portable `.exe`,它自己把 dsh 拉起来、等端口就绪、开窗口、嵌 UI;关窗口收托盘,退出时把整个进程树 `taskkill`。现在 v0.3.1,MIT 开源。

![主界面](https://github.com/yourname/dsh-client/raw/main/docs/screenshots/screenshot-light.png)

> 下文里的 `USER/REPO` 是占位符,请替换成实际仓库路径。

---

## 一、我是怎么用 dsh 的

我的日常用法很朴素:一天里断断续续开十几次,每次问一两个问题或者跑一个小任务,平均单次停留 30 秒到 3 分钟。

这种「高频、短时长」的使用模式,决定了体验的瓶颈根本不在模型,而在**从「我想用」到「我看到输入框」之间那几秒钟**。浏览器方案里这几秒钟包含:切窗口 → 找标签页 → 页面可能已经被浏览器休眠 → 等重新连上。

桌面客户端要解决的就是这一件事:把这几秒压到一次按键。`Ctrl+Shift+D`,窗口出现在你上次放它的位置,输入框已经聚焦。

## 二、核心:把 dsh 当子进程管起来

整个项目最本质的部分只有一件事——**进程生命周期管理**。我把它单独拆成了 `src/dsh-manager.js`,这个模块刻意**不 import electron**,只用 `child_process` + `http`,这样它可以在 Node 里被纯粹地单元测试。

spawn 部分:

```js
function spawnDsh({ bin, cwd, env = {} }) {
  if (!fs.existsSync(bin)) throw new Error(`dsh 二进制不存在: ${bin}`);
  if (!fs.existsSync(cwd)) throw new Error(`dsh 工作目录不存在: ${cwd}`);

  const child = spawn('cmd.exe', ['/c', bin, 'web'], {
    cwd,
    env: { ...process.env, ...env, NODE_ENV: env.NODE_ENV || 'production' },
    windowsHide: true,               // 不闪黑窗
    stdio: ['ignore', 'pipe', 'pipe'], // stdout/stderr 收进日志缓冲
  });

  return child;
}
```

然后是「什么时候可以开窗口」。这里我踩过坑(见后文),最后的答案是**不要信日志,要信端口**:

```js
function waitForDshReady({ port = 3080, timeoutMs = 60000, intervalMs = 500, onTick }) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    let attempts = 0;

    const attempt = () => {
      attempts++;
      onTick?.(attempts, Math.round((Date.now() - start) / 1000));
      const req = http.get({ host: '127.0.0.1', port, path: '/', timeout: 1500 }, (res) => {
        res.resume();
        resolve(attempts);
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`dsh 启动超时 (60s),端口 ${port} 未响应`));
        } else {
          setTimeout(attempt, intervalMs);
        }
      });
      req.on('timeout', () => req.destroy(new Error('timeout')));
    };

    attempt();
  });
}
```

`onTick` 回调是给启动画面用的:每次轮询把「第几次尝试 / 过了几秒」推给 splash 窗口,用户看到的是进度条在动,而不是一个疑似卡死的黑框。

退出时清理:

```js
function killProcessTree(child, platform = process.platform) {
  if (!child || child.killed) return;
  if (platform === 'win32' && child.pid) {
    spawn('taskkill', ['/pid', String(child.pid), '/f', '/t'], { windowsHide: true });
  } else {
    child.kill();
  }
}
```

`/t` 是关键。因为我们是 `cmd.exe /c dsh.cmd web` 起的,`child.pid` 是那个 cmd 的 pid,真正的 node 进程是它的孩子。只 `child.kill()` 会留下孤儿 node 占着 3080。

## 三、几个真正每天在用的功能

### 1. 8 个全局快捷键

`src/shortcuts.js` 是**纯数据**,`main.js` 读它去 `globalShortcut.register`,新增一个快捷键就是加一个对象:

```js
const shortcuts = {
  toggleWindow: { accelerator: 'CommandOrControl+Shift+D', label: '显示 / 隐藏主窗口', scope: 'global', onPress: 'toggleMainWindow' },
  reloadDsh:    { accelerator: 'CommandOrControl+Shift+R', label: '重启 dsh 子进程',   scope: 'global', onPress: 'reloadDshAndReload' },
  quit:         { accelerator: 'CommandOrControl+Shift+Q', label: '完全退出 (含 dsh)',  scope: 'global', onPress: 'quit' },
  screenshot:   { accelerator: 'CommandOrControl+Shift+S', label: '截图整个窗口',      scope: 'global', channel: 'dsh:trigger-screenshot' },
  themeToggle:  { accelerator: 'CommandOrControl+Shift+T', label: '切换主题',          scope: 'global', channel: 'dsh:toggle-theme' },
  openLogs:     { accelerator: 'CommandOrControl+Shift+L', label: '打开日志查看器',    scope: 'global', channel: 'dsh:open-log-viewer' },
  openCommandPalette:    { accelerator: 'CommandOrControl+K',       scope: 'local', channel: 'dsh:open-command-palette' },
  openCommandPaletteAlt: { accelerator: 'CommandOrControl+Shift+P', scope: 'local', channel: 'dsh:open-command-palette' },
};
```

`scope: 'global'` 的意思是窗口隐藏时也生效。日常用得最多的是 `Ctrl+Shift+D`(唤起/收起)和 `Ctrl+Shift+R`(dsh 抽风了直接重启子进程,不用关整个 app)。

### 2. 命令面板(Ctrl+K)

13 条命令,VS Code 那套交互:模糊搜索、`↑↓` 选、`Enter` 执行、`Esc` 关。registry 同样是纯数据 + 一个小 fuzzy matcher,零 DOM 依赖,所以可以直接单测:

```js
{
  id: 'theme.toggle',
  label: '切换深色 / 浅色主题',
  category: '主题',
  keywords: 'theme dark light toggle 主题 切换',
  action: 'dsh:toggle-theme',
  accelerator: 'Ctrl+Shift+T',
}
```

`action` 故意是字符串 opcode 而不是函数——registry 可序列化,渲染层再把 opcode 翻成 IPC 调用。测试的时候断言「搜 '主题' 能命中这条」就够了,不用起 Electron。

![命令面板](https://github.com/yourname/dsh-client/raw/main/docs/screenshots/command-palette.png)

### 3. 日志查看器(Ctrl+Shift+L)

1000 行 ring buffer,dsh-client 自身的日志 + dsh 子进程的 stdout/stderr 全进去。支持搜索(`Ctrl+F` 聚焦)、复制全部、清空、双击行复制单行。

这个功能是 debug 时长出来的:dsh 是 Dev Preview,偶尔会吐奇怪的 stderr,如果你把子进程的输出丢掉,出问题时你什么都不知道。有了它,「它怎么又不动了」这种问题基本上一个快捷键就看到答案。

### 4. 窗口位置记忆(多显示器安全)

存 `windowBounds` + `windowMaximized`,resize/move 用 400ms debounce 落盘。恢复时**校验 bounds 必须落在当前连接的某块 display 内**,否则忽略。笔记本插拔外接屏的人应该知道为什么必须做这个校验——不做的话窗口会开在一块不存在的屏幕上,你只能去删配置文件。

### 5. 主题 + 玻璃标题栏

深色/浅色一键切,持久化到 `settings.json`,标题栏 chrome 跟着变。无边框 + 全局深蓝品牌色 + 半透明标题栏。这部分纯粹是我个人审美,但 `Ctrl+Shift+T` 在半夜确实有用。

![深色主题](https://github.com/yourname/dsh-client/raw/main/docs/screenshots/screenshot-dark.png)

## 四、工程上的几个决定

**技术栈**:Electron 32 + Node.js 24 + Three.js(splash 的动效)。

**打包**:portable `.exe`,92 MB,免安装、不要管理员权限。Electron + Node 都打进去了,**终端用户不需要装 Node.js**(源码开发才需要 Node 22+)。

**安全**:`contextIsolation: true`,没有 `nodeIntegration`。渲染层只能看到 `window.dsh` 这一个最小 API 面(约 26 个方法),每个都在 `src/ipc-handlers.js` 里显式注册。嵌的是本地 dsh UI,但 renderer 拿不到 `require` 这件事该做还是要做。

**模块化**:`src/` 下 8 个模块,每个可独立测试——`dsh-manager` / `dsh-path` / `settings` / `commands` / `shortcuts` / `window-state` / `ipc-handlers` / `splash` / `logger`。判断标准很简单:能不 import electron 就不 import。

**测试**:124 个 Vitest,76.5% 覆盖率。覆盖不到的基本都是必须真跑 Electron 的窗口代码,那部分我手测。

**CI**:4 个 GitHub Actions —— `test.yml`(测试 + lint)、`lint.yml`(风格)、`build.yml`(打 .exe)、`release.yml`(发布)。

**配置**:`%APPDATA%\dsh-client\dsh-client-settings.json`,存主题、窗口位置、dsh 路径。也支持 `DSH_BIN` / `DSH_CWD` / `DSH_ENV_FILE` 环境变量覆盖,便携场景友好。

## 五、5 个真实的坑

**坑 1:用日志判断「启动好了」是错的。**
一开始我 grep 子进程 stderr 里的 `listening`,匹配到就开窗口。结果 dsh 打完那行日志之后还要几百毫秒才真正 accept 连接,窗口开出来是白屏。改成 HTTP 轮询端口之后再没出过问题。日志关键字匹配(`/listening|ready|started|3080/i`)我留着了,但只用来在 splash 上做「阶段提示」,**不作为就绪判据**。

**坑 2:`child.kill()` 杀不掉 `cmd.exe /c` 的孙子进程。**
Windows 上你必须 `taskkill /pid <pid> /f /t`。少了 `/t` 就是每次退出留一个 node 占 3080,下次启动直接超时。这个坑我交了两次学费才反应过来。

**坑 3:端口 3080 被占时的报错要说人话。**
`EADDRINUSE` 对开发者可读,对「我只想用一下」的用户等于噪音。现在超时后 splash 上直接写「dsh 启动超时 (60s),端口 3080 未响应」,并在故障排查文档里给出 `taskkill /f /im node.exe /fi "WINDOWTITLE eq dsh*"`。启动超时、端口被占、API key 缺失三种情况都有各自的提示文案。

**坑 4:`npm install` 拉 Electron 二进制在国内会卡死。**
不是代理问题,是 GitHub Releases 的 CDN。设 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` 再装。这条我直接写进 README 的故障排查了,因为它是新 contributor 的第一道墙。

**坑 5:窗口位置恢复必须校验显示器。**
上面提过。存的时候很爽,拔掉外接屏之后你的应用就消失了。校验逻辑是:遍历 `screen.getAllDisplays()`,存的 bounds 至少要和一块屏有交集,否则退回默认居中。

## 六、开源了,以及接下来做什么

- 仓库:https://github.com/yourname/dsh-client
- License:MIT,随便拿去改、拿去内嵌、拿去改名
- 文档齐了:README(中英双语)、CHANGELOG、CONTRIBUTING、SECURITY、CODE_OF_CONDUCT

上游的 `dsh` 是 DeepSeek 团队的作品,这个仓库只是个桌面壳,该谢的是他们把 harness 开源出来了。

**Roadmap**(欢迎抢):

1. 真正的 auto-update(现在是 stub,接 GitHub Releases 就能用);
2. macOS / Linux 构建——进程树清理那块要重写(Windows 走 `taskkill`,Unix 走进程组);
3. 端口可配置,支持同时跑多个 dsh 实例;
4. 系统级全局唤起(现在还是 app 级 `globalShortcut`)。

如果你也在用 dsh,而且和我一样受不了那个常驻终端窗口,可以直接下 portable exe 试;如果你想插手,`CONTRIBUTING.md` 里写了怎么起环境,issue 里带 `good first issue` 标签的都欢迎拿走。

---

**GitHub**:https://github.com/yourname/dsh-client(请替换)
**下载**:https://github.com/yourname/dsh-client/releases(请替换)
**License**:MIT
**Stars**:⭐ Star me on GitHub
