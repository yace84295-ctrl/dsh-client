# 🚀 GitHub Setup Guide / 推到 GitHub 指南

This document explains how to push `dsh-client` to **your own GitHub repository**.

本文说明如何把 `dsh-client` 推到**你自己的 GitHub 仓库**。

---

## TL;DR

```bash
# 1. 在 GitHub 上创建空仓库(不要勾选 README / .gitignore / LICENSE)
#    仓库名建议: dsh-client
#    公开/私有自选

# 2. 从本地 bundle 解包
git clone G:/Hermes/dsh-client/dsh-client.bundle dsh-client-new
cd dsh-client-new
git remote set-url origin https://github.com/<your-username>/dsh-client.git

# 3. 推送
git push -u origin main
```

---

## Step-by-step / 详细步骤

### 1. Decide your repo name / 决定仓库名

We suggest one of:

| Name | Pros | Cons |
|------|------|------|
| **`dsh-client`** | Short, on-brand, easy to type | Generic — might collide with other "dsh" clients |
| `deepseek-harness-desktop` | Descriptive, SEO-friendly | Long |
| `dsh-electron-wrapper` | Technically accurate | Verbose |
| `<your-name>/dsh` | Personal | Implies fork of upstream `dsh` |

We chose **`dsh-client`** as the placeholder in `package.json`. Change it everywhere with:

```bash
sed -i 's|yourname/dsh-client|<your-gh-user>/<your-repo>|g' package.json README.md CHANGELOG.md SECURITY.md CODE_OF_CONDUCT.md docs/*.md
```

### 2. Create the GitHub repo / 在 GitHub 创建空仓库

1. Go to https://github.com/new
2. **Owner:** your account
3. **Repository name:** `dsh-client` (or whatever you chose)
4. **Description:** `Electron desktop client for DeepSeek Harness (dsh)`
5. **Public / Private:** your call
6. **⚠️ Do NOT check** "Add a README", "Add .gitignore", "Choose a license" — we already have those.
7. Click **Create repository**

GitHub will show you a "Quick setup" page — copy the URL, it will look like:
```
https://github.com/<your-username>/dsh-client.git
```

### 3. Restore from the bundle / 从 bundle 恢复

The repo was committed locally as a git bundle file. Two options:

#### Option A — Clone the bundle into a fresh working copy

```bash
cd /g/Hermes
git clone dsh-client/dsh-client.bundle dsh-client-fresh
cd dsh-client-fresh
git remote remove origin                  # the bundle had a fake origin
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

#### Option B — Use the existing working tree (if you kept it)

```bash
cd /g/Hermes/dsh-client
git remote remove origin
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### 4. After the first push / 第一次推送后

1. **Verify on GitHub:** visit the repo URL and confirm the files are there.

2. **Replace placeholders:**
   ```bash
   # Find all remaining "yourname" / "your-username" placeholders
   grep -rn "yourname\|your-username" .
   ```
   Then edit:
   - `package.json` — `repository.url`, `author.url`, `homepage`, `bugs.url`, `build.publish[0].owner`
   - `README.md` — all `yourname/dsh-client` links
   - `CHANGELOG.md` — comparison link URLs
   - `SECURITY.md` — `security@dsh-client.local`
   - `CODE_OF_CONDUCT.md` — `conduct@dsh-client.local`
   - All GitHub Actions workflows reference `${GITHUB_REF_NAME}` — already correct

3. **Add topics / 加 topics** (improves discoverability):
   - Go to repo → ⚙️ next to "About" → add topics:
     ```
     electron deepseek dsh deepseek-harness desktop windows portable ai chatbot wrapper
     ```

4. **Turn on GitHub Actions / 启用 Actions:**
   - Actions tab → "I understand my workflows, go ahead and enable them"
   - First build should trigger automatically.

5. **First release / 第一个 Release:**
   - The workflow `.github/workflows/release.yml` triggers on tag push.
   - Bump version (or use the current `0.3.0`):
     ```bash
     git tag -a v0.3.0 -m "v0.3.0 — open-source release"
     git push origin v0.3.0
     ```
   - The workflow will draft a Release with `dsh-client-portable-0.3.0.exe` attached.
   - Review + publish.

6. **(Optional) Enable auto-update / 启用自动更新:**
   - In `package.json`, set `build.publish[0].owner` to your GitHub username.
   - Build with `DSH_AUTO_UPDATE=1 GH_TOKEN=<token>` so `electron-updater` signs releases.
   - See [electron-builder docs](https://www.electron.build/configuration/publish).

### 5. Replace placeholder contact emails / 替换占位邮箱

The repo currently ships with `security@dsh-client.local` and `conduct@dsh-client.local` as placeholders. Replace these with real addresses before going public:

- `SECURITY.md`
- `CODE_OF_CONDUCT.md`

Common pattern:
- `<username>+security@users.noreply.github.com` (forwarded to your GitHub email)
- Or set up a `security@yourdomain.com` and `conduct@yourdomain.com` if you have one.

### 6. Pin the repo / 置顶仓库

On your GitHub profile, pin `dsh-client` so visitors see it first.

---

## 🧹 Cleanup / 清理

After pushing, the local `dsh-client/` directory is still a working git repo. You can:

```bash
# Keep it as your dev working tree
cd /g/Hermes/dsh-client
git remote -v                          # confirm origin is set correctly
git status                             # should be clean

# Or delete it and work only in dsh-client-fresh
rm -rf /g/Hermes/dsh-client
```

The bundle file `dsh-client.bundle` is also still on disk. Delete it once you've confirmed the push succeeded:

```bash
rm /g/Hermes/dsh-client/dsh-client.bundle
```

---

## ❓ Troubleshooting

### `git push` asks for credentials

GitHub no longer accepts password auth. Use:

- **Personal Access Token (classic, `repo` scope):** Settings → Developer settings → PATs
- **SSH key:** `git remote set-url origin git@github.com:<user>/<repo>.git`

### "Repository not found"

Check the URL — case-sensitive and the username must match the owner.

### "Updates were rejected because the remote contains work that you do not have locally"

The remote already has commits (e.g. you initialized it with a README). Force-push:

```bash
git push -u origin main --force
```

Or pull first:

```bash
git pull --rebase origin main
git push
```

### Build fails on first GitHub Actions run

- Check the Actions log — usually a `npm ci` failure due to Node version. The workflow pins Node 24; if your `engines` field requires something else, fix it.
- Check `GH_TOKEN` permissions — `permissions: contents: write` is set on the `release.yml` job.

---

## 🎉 Done!

Once the repo is public, share it on:
- Reddit: r/electron, r/deepseek
- Hacker News (Show HN)
- Dev.to / Hashnode (write a "Why I built dsh-client" post)
- Product Hunt

Good luck! 🧠
