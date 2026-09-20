# 🚀 dsh-client 发布到 GitHub 完整 checklist

> **目标**:把本地 `G:\Hermes\dsh-client\` 仓库推到 GitHub,并发 v0.3.1 release。
> **预计耗时**:15 分钟(纯人工操作,无需特殊权限)。
> **前置**:你的 Windows / Mac / Linux 终端能访问 `github.com`。

---

## 第 0 阶段:发布前最后 1 分钟(sandbox 里已做好的事)

> 这一段记录在 sandbox 里已经替你完成的全部动作,**你不需要再动**。
> 但回电脑后请逐项核对,确认状态。

- [x] **替换 USER/REPO 占位符** → `yourname/dsh-client`(3 个 promo 文件共 22 处)
- [x] **完善 `package.json`** — `author` / `contributors` / `funding` / `engines.npm` / `os` / `cpu` / `private: false` / `publishConfig.access` / 新 keywords(`ai-agent` / `command-palette` / `open-source`)
- [x] **`CHANGELOG.md` 加 v0.3.1 section**(模块化重构 + 测试 + CI + 修复 + 文件统计)
- [x] **`README.md` 顶部加 ⚠️ 占位符警告**(用户回电脑后必须替换)
- [x] **`README.md` badge 从 v0.3.0 → v0.3.1**
- [x] **`CHANGELOG_VERSION.md`**(独立发布说明,可直接贴进 GitHub release)
- [x] **`RELEASE_CHECKLIST.md`**(本文)
- [x] **`GITHUB_PUBLISH_GUIDE.md`**(3 步极简版)
- [x] **git commit + 新 bundle**

---

## 第一阶段:回电脑后(发布前 1 小时)

### A. 准备 GitHub 账号和 PAT

- [ ] 登录 GitHub
- [ ] 创建 Personal Access Token (PAT)
  - Settings → Developer settings → Personal access tokens → **Tokens (classic)**
  - **Generate new token** → **Generate new token (classic)**
  - Note:`dsh-client-release-2026-09`(便于以后撤销)
  - Expiration:90 days 或 No expiration(按你偏好)
  - Scopes:
    - ✅ `repo`(full control of private repositories)
    - ✅ `workflow`(update GitHub Action workflows,可选但推荐)
  - **Generate token** → 复制(只显示一次!)
  - 存到密码管理器(1Password / Bitwarden / Windows Credential Manager),**不要 commit 到代码!**

### B. 准备代码改动

#### B1. 全局替换 `yourname/dsh-client` 为你的真实路径

把 `yourname/dsh-client` 替换成 `<你的GitHub用户名>/dsh-client`(示例:`octocat/dsh-client`)。

**Linux / macOS / git-bash**:

```bash
cd /path/to/dsh-client      # Windows 下用 cd /g/Hermes/dsh-client

grep -rl 'yourname/dsh-client' . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=coverage
# 应该看到这些被打中:README.md / CHANGELOG.md / package.json / src/ipc-handlers.js / docs/development.md / promo/*.md

# 真正替换
grep -rl 'yourname/dsh-client' . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=coverage \
  | xargs sed -i 's|yourname/dsh-client|<你的用户名>/dsh-client|g'

# 验证替换彻底
grep -rn 'yourname/dsh-client' . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=coverage
# 应该无输出
```

**Windows PowerShell**(不用 git-bash 时):

```powershell
cd G:\Hermes\dsh-client

Get-ChildItem -Recurse -Exclude node_modules,.git,dist,coverage |
  Select-String -Pattern 'yourname/dsh-client' -List |
  ForEach-Object {
    (Get-Content -Raw $_.Path) -replace 'yourname/dsh-client','<你的用户名>/dsh-client' |
      Set-Content -NoNewline $_.Path
  }
```

#### B2. 全局替换 `USER/REPO` 为真实路径

`promo/*.md` 里还有 5 处 `USER/REPO` 标注文字(在提示语里),一并替换:

```bash
grep -rl 'USER/REPO' . --exclude-dir=node_modules --exclude-dir=.git \
  | xargs sed -i 's|USER/REPO|<你的用户名>/dsh-client|g'
```

#### B3. 提交替换改动

```bash
git status          # 看影响范围
git diff --stat
git add .
git commit -m "chore: replace placeholder repo path with real GitHub username"
```

### C. 创建 GitHub 仓库

- [ ] 打开 https://github.com/new
- [ ] Owner:**`<你的 GitHub 用户名>`**
- [ ] Repository name:**`dsh-client`**
- [ ] Description:
  ```
  Electron desktop client for DeepSeek Harness (dsh) — one-click run, command palette, 124 tests, MIT
  ```
- [ ] Public / Private:**Public**(开源)
- [ ] ❌ **不要**勾选 "Add a README file"(我们有)
- [ ] ❌ **不要**勾选 "Add .gitignore"(我们有)
- [ ] ❌ **不要**勾选 "Choose a license"(我们有 MIT)
- [ ] **Create repository**

---

## 第二阶段:本地推送

### D. 配置 git + push

```bash
cd /g/Hermes/dsh-client

# 配置 git 身份(首次推送要)
git config user.name  "<你的 GitHub 用户名>"
git config user.email "<你的 GitHub 邮箱>"

# 添加远程仓库(PAT 认证方式,推荐首次推送用,避免 SSH 配置)
git remote add origin https://<TOKEN>@github.com/<你的用户名>/dsh-client.git

# 验证远程
git remote -v
# 应该输出:
# origin  https://<TOKEN>@github.com/<你的用户名>/dsh-client.git (fetch)
# origin  https://<TOKEN>@github.com/<你的用户名>/dsh-client.git (push)

# 推送(首次推送)
git branch -M main
git push -u origin main
```

> ⚠️ 把 `<TOKEN>` 替换成你在 **A 阶段** 拿到的 PAT(包含 `ghp_` 前缀的整串)。
> ⚠️ Windows 下推荐 git-bash 终端,POSIX 路径更顺手。

### E. 验证推送成功

- [ ] GitHub 仓库页面刷新,所有文件显示(README / src/ / tests/ / .github/ / docs/ / promo/ / dist/...)
- [ ] README.md 顶部徽章(badges)正确显示(注意:`Release-v0.3.1` 是橙色)
- [ ] ⚠️ 警告区块里的 `<你的用户名>/dsh-client` 已被替换成你的真实路径
- [ ] GitHub Actions 自动跑测试 → 全部绿色 ✓
  - 路径:仓库 → Actions → 看 `Build` / `Lint` 两个 workflow 是否都绿
- [ ] 主页能看到 8 个 `src/` 模块 + 9 个测试文件 + 4 张截图

---

## 第三阶段:创建 Release

### F. 创建 v0.3.1 release

- [ ] GitHub 仓库 → 右侧栏 → **"Create a new release"**(或访问 `/releases/new`)
- [ ] **Choose a tag**:
  - 输入框填 `v0.3.1`
  - 下拉框选 **"Create new tag: v0.3.1 on publish"**
- [ ] **Release title**:
  ```
  dsh-client v0.3.1 — Initial open-source release
  ```
- [ ] **Description**:复制粘贴 [`CHANGELOG_VERSION.md`](CHANGELOG_VERSION.md) 全文
  - 或复制 [`CHANGELOG.md`](CHANGELOG.md) 里 `## [0.3.1]` 整段
- [ ] **Attach binaries**:
  - 把 `G:\Hermes\dsh-client\dist\dsh-client-portable-0.3.1.exe` 拖进 "Attach binaries" 框
- [ ] ❌ 不要勾选 "Set as a pre-release"
- [ ] ✅ 勾选 "Set as the latest release"
- [ ] **Publish release**

### G. 仓库设置(发布 release 后)

回到仓库主页 → ⚙ **Settings**:

- [ ] **General → Features**:
  - [x] ✅ **Discussions**(启用,让用户提问 / 提 feature request)
  - [ ] ❌ Wiki(不勾)
- [ ] **General → Pull Requests**:
  - [x] ✅ Allow squash merging
  - [x] ✅ Always suggest updating pull request branches
  - [x] ✅ Allow auto-merge
  - [x] ✅ Automatically delete head branches
- [ ] **Code and automation → Branches**:
  - [ ] Add rule → Branch name pattern: `main`
    - [x] ✅ Require status checks to pass before merging → 选 `build` / `lint` workflow
    - [x] ✅ Require branches to be up to date before merging
    - [x] ✅ Require linear history
    - [x] ✅ Do not allow bypassing the above settings
- [ ] **右侧栏 ⚙ About**(点仓库主页右侧的齿轮):
  - **Description**:
    ```
    Electron desktop client for DeepSeek Harness (dsh) — one-click run, command palette, 124 tests, MIT
    ```
  - **Website**:留空
  - **Topics**(标签,逐个点击 + 号添加):
    ```
    electron
    deepseek
    dsh
    desktop-app
    ai-agent
    open-source
    windows
    portable
    ```
  - [x] ✅ Releases
  - [x] ✅ Packages

---

## 第四阶段:推广(分 4 天)

> 详细节奏见 [`promo/README.md`](promo/README.md)。

### Day 1 上午 — V2EX

- [ ] 打开 https://v2ex.com/write?node=create
- [ ] Node:**创造者**
- [ ] Title:用 [`promo/article-v2ex-juejin.md`](promo/article-v2ex-juejin.md) 的标题
- [ ] Body:整篇文章(已经替换好 `yourname/dsh-client`)
- [ ] Tags:`DeepSeek`, `Electron`, `开源软件`, `AI Agent`
- [ ] Submit
- [ ] 自己顶 + 收藏
- [ ] 当天盯评论,回复互动(尤其 Electron 体积、iframe、跨平台三个必被问的点)

### Day 1 晚间 — 掘金

- [ ] 打开 https://juejin.cn/post/new
- [ ] 同篇文章,标签打 `AI`、`开源`、`Electron`、`Node.js`
- [ ] Markdown 模式粘贴
- [ ] 分类:`AI` / `开源`
- [ ] 发布

### Day 2~3 — 知乎 + 公众号

- [ ] **知乎专栏**(粘贴 [`promo/article-zhihu-wechat.md`](promo/article-zhihu-wechat.md))
  - 话题:`AI Agent` / `DeepSeek` / `开源软件`
- [ ] **公众号**(原文不动,首图用浅色主界面截图 `docs/screenshots/screenshot-light.png`)

### Day 3~4 — 社交平台收尾

- [ ] **Twitter thread**:粘贴 [`promo/article-twitter-weibo-xiaohongshu.md`](promo/article-twitter-weibo-xiaohongshu.md) 的 7 条推(每条独立成推,可拆开发)
- [ ] **微博**:2 条(主发 + 补充),保持 140 字内
- [ ] **小红书**:4 张配图笔记,标题 < 20 字,标签用满 10 个

---

## 第五阶段:维护(发后 1 周)

- [ ] 每天看 GitHub Issues,回复 bug 报告
- [ ] 每周看 Discussions,回复提问
- [ ] 每月看 PR,审 review
- [ ] 收集用户反馈,做 v0.4.0 计划

---

## 🎯 一键发布命令(回电脑后)

### 用 PAT 一键 push:

```bash
cd /g/Hermes/dsh-client
git push https://<TOKEN>@github.com/<你的用户名>/dsh-client.git main
```

### 或先设 remote 再 push(推荐):

```bash
cd /g/Hermes/dsh-client
git remote add origin https://<TOKEN>@github.com/<你的用户名>/dsh-client.git
git push -u origin main
```

### 或用 SSH(长期更安全):

```bash
# 设置 SSH key(一次性)
ssh-keygen -t ed25519 -C "your@email.com"
# 把 ~/.ssh/id_ed25519.pub 复制到 GitHub Settings → SSH and GPG keys → New SSH key

# 切换 remote 到 SSH
git remote set-url origin git@github.com:<你的用户名>/dsh-client.git
git push -u origin main
```

---

## ✅ 验证清单

完成后你应该看到:

- [ ] GitHub 仓库:`https://github.com/你的用户名/dsh-client`
- [ ] README 显示徽章 + 截图 + 完整功能介绍
- [ ] 124 个测试 ✓(GitHub Actions 绿色)
- [ ] Release `v0.3.1` 在 `https://github.com/你的用户名/dsh-client/releases` 可下载
- [ ] README 顶部的 [Download](#) 链接指向 release 的 .exe(默认 `releases/latest`)
- [ ] 推文 / 知乎 / 微博 都有互动

---

## 🚨 常见坑

| 坑 | 症状 | 解法 |
|----|------|------|
| PAT 权限不足 | push 报 403 | 重新生成 PAT,勾选 `repo` scope |
| PAT 在 URL 里 | 担心泄露 | 用完后立刻 `git remote set-url origin git@github.com:...` 切回 SSH,或 Regenerate token |
| GitHub Actions 失败 | build.yml 标红 | 看 Actions 日志;Node 22+ 没装(workflow 用 24)|
| 截图渲染不出 | `screenshot-palette.png` 404 | 文件名是 `command-palette.png`,不是 `screenshot-palette.png`!|
| 用户名替换漏了 | README 里还有 `yourname/dsh-client` | `grep -rn 'yourname/dsh-client' .` 再来一遍 |
| auto-update 报错 | electron-updater 401 | `auto-update` 默认不开启(只在 `DSH_AUTO_UPDATE=1` 时启用),不影响日常使用 |

---

## 📂 相关文件速查

| 文件 | 用途 |
|------|------|
| `GITHUB_PUBLISH_GUIDE.md` | 3 步极简版(30 秒看完) |
| `CHANGELOG_VERSION.md` | v0.3.1 release 完整说明(可贴进 GitHub Release) |
| `CHANGELOG.md` | 全版本历史 |
| `GITHUB_SETUP.md` | 更老的 GitHub 准备工作笔记(sandbox 前的版本) |
| `RELEASE_READY.md` | sandbox 阶段产物状态 |
| `promo/README.md` | 推广文发布节奏 |
| `promo/article-v2ex-juejin.md` | V2EX / 掘金文 |
| `promo/article-zhihu-wechat.md` | 知乎 / 公众号文 |
| `promo/article-twitter-weibo-xiaohongshu.md` | Twitter / 微博 / 小红书 |
| `dist/dsh-client-portable-0.3.1.exe` | 上传到 Release 的便携二进制 |
| `dsh-client.bundle` | git bundle 备份(回电脑后用作 fallback)|

---

**祝发布顺利!** 🎉