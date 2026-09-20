# 🚀 发布到 GitHub — 30 秒极简版

> **你只需要做 3 件事**,回电脑后 5 分钟搞定。

---

## 1️⃣ 创建仓库(网页,1 分钟)

- 打开 https://github.com/new
- Owner:你的 GitHub 用户名
- Repository name:`dsh-client`
- Description:`Electron desktop client for DeepSeek Harness (dsh) — one-click run, command palette, 124 tests, MIT`
- Public
- ❌ 不要勾 Add README / .gitignore / license(我们都有了)
- **Create repository**

---

## 2️⃣ 推送代码(终端,30 秒)

打开 **git-bash**(Windows)或 **Terminal**(macOS / Linux),运行:

```bash
cd /g/Hermes/dsh-client

# 全局替换占位符(必做!否则 README 里都是 yourname/dsh-client)
sed -i 's|yourname/dsh-client|<你的用户名>/dsh-client|g' \
  README.md CHANGELOG.md package.json src/ipc-handlers.js docs/development.md promo/*.md
sed -i 's|USER/REPO|<你的用户名>/dsh-client|g' promo/*.md

# 提交替换
git add .
git commit -m "chore: replace placeholder repo path with real GitHub username"

# 配置 git 身份(首次)
git config user.name  "<你的GitHub用户名>"
git config user.email "<你的GitHub邮箱>"

# 推送(用 Personal Access Token 认证,把 <TOKEN> 换成 ghp_开头的整串)
git remote add origin https://<TOKEN>@github.com/<你的用户名>/dsh-client.git
git branch -M main
git push -u origin main
```

> 🔑 没 PAT?Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token
> Scopes 勾 `repo`,复制整串(只显示一次!)

---

## 3️⃣ 创建 Release(网页,2 分钟)

- 仓库主页 → 右侧栏 → **Create a new release**(或访问 `/releases/new`)
- Choose a tag:`v0.3.1`(下拉选 "Create new tag: v0.3.1 on publish")
- Release title:`dsh-client v0.3.1 — Initial open-source release`
- Description:把 [`CHANGELOG_VERSION.md`](CHANGELOG_VERSION.md) 全文粘贴进来
- 拖 `dist\dsh-client-portable-0.3.1.exe` 到 "Attach binaries"
- ✅ 勾 "Set as the latest release"
- **Publish release**

---

## 完成!🎉

- 任何人访问 `https://github.com/你的用户名/dsh-client` → 看 README → 下载 .exe → 双击运行 → 直接用

---

## 📋 完整步骤

详细步骤(每步带验证 + 截图提示 + 常见坑)见 [`RELEASE_CHECKLIST.md`](RELEASE_CHECKLIST.md)。

## 📦 推广

发完后第一天就开始 V2EX → 掘金 → 知乎 → Twitter。详细节奏见 [`promo/README.md`](promo/README.md)。

---

**关键提醒**:
1. **第 2 步的 `sed` 必做** — 不替换 `yourname/dsh-client` 你的 README 里全是占位符。
2. **PAT 不要 commit 到代码** — 推送完立刻切回 SSH(`git remote set-url origin git@github.com:...`)。
3. **Release Description 用 [`CHANGELOG_VERSION.md`](CHANGELOG_VERSION.md)** — 已写好,直接复制粘贴。