# Security Policy / 安全策略

## 📣 Reporting a Vulnerability / 报告漏洞

If you discover a security issue in **dsh-client**, please report it privately:

- **Email:** security@dsh-client.local *(placeholder — replace before publishing)*
- **GitHub:** [Open a private security advisory](../../security/advisories/new)

Please **do NOT** open a public GitHub issue for security bugs. We will respond within 72 hours and coordinate a fix and disclosure timeline.

发现安全漏洞,请**不要**在公开 issue 中报告,优先通过上面邮箱私下联系,我们会在 72 小时内响应。

---

## 🛡️ Supported Versions / 支持的版本

| Version | Supported          |
|---------|--------------------|
| 0.3.x   | ✅ Active          |
| 0.2.x   | ⚠️ Critical fixes only |
| 0.1.x   | ❌ End of life     |

We recommend always running the latest release.

---

## ⚠️ Known Security Limitations / 已知安全限制

These are **by design** but worth understanding before deploying:

### 1. The embedded iframe runs in a permissive sandbox

The `<iframe src="http://127.0.0.1:3080">` uses `sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"` so the embedded dsh Web UI can function normally.

- ✅ We do **not** set `nodeIntegration: true` and do **not** enable the `remote` module.
- ✅ We use `contextIsolation: true` for our renderer (`index.html`); only a minimal API is exposed via `preload.js`.
- ⚠️ However, if a malicious page is loaded into the iframe (e.g. you navigate to a non-dsh URL via DevTools), it can run scripts. **Mitigation:** the iframe `src` is hard-coded to `http://127.0.0.1:3080`; we never accept user-controlled URLs.

### 2. Single-instance lock can be defeated by a same-named process

The Electron single-instance lock uses the app's `name` / `appId`. If another app claims the same identity, our app refuses to start (or the other app refuses to start). This is a usability trade-off, not a vulnerability.

### 3. Global shortcuts

We register 6 global shortcuts (`Ctrl+Shift+D / R / Q / S / T / L`). These run **whether or not our window is focused**, on any application.

- ✅ All handlers are non-destructive — they only call IPC channels we control.
- ⚠️ `Ctrl+Shift+Q` fully quits the app (and kills dsh). If you rebind other apps to the same combination, conflicts may occur. We register with `tryReg` and tolerate failures silently.

### 4. Auto-update is currently disabled

We depend on `electron-updater` but **do not call `checkForUpdatesAndNotify()`** by default. The `dsh:checkUpdate` IPC handler returns a hard-coded "no update" stub.

- ✅ No outbound HTTP calls to GitHub unless you explicitly set `DSH_AUTO_UPDATE=1` and configure `build.publish` in `package.json`.
- ⚠️ When you do enable it: ensure your GitHub releases are signed and your `GH_TOKEN` is scoped to the repo only.

### 5. The DeepSeek API key is read from a plaintext file

`DEEPSEEK_API_KEY` is read from `%APPDATA%\dsh-client\.env` (or `DSH_ENV_FILE`; the older `%LOCALAPPDATA%\hermes\.env` is still read as a fallback). It's passed to the dsh child process via environment variable.

- ✅ The key is never written to disk by us.
- ✅ The key never leaves your machine except via HTTPS to DeepSeek.
- ⚠️ Anyone with read access to your user profile can read the `.env` file. Consider encrypting the volume with BitLocker (standard on modern Windows) and limiting profile access.

### 6. `screenshot-to-disk` writes to the path the user picks

We write captured PNGs to the location the user selects via `dialog.showSaveDialog`. We never auto-upload screenshots.

---

## 🔄 Upgrade Strategy / 升级策略

- We follow **semver**: minor / patch versions are backwards-compatible.
- Breaking changes to the settings file format will be documented in [CHANGELOG.md](CHANGELOG.md) and a migration shim will be shipped.
- Critical security fixes will be backported to the previous minor for 90 days.

## 🔏 Supply chain / 供应链

- All build dependencies are pinned with `^` in `package.json` and locked with `package-lock.json` (committed to the repo).
- CI builds on `windows-latest` GitHub-hosted runners — no third-party build machines.
- Releases are produced by GitHub Actions and attached to GitHub Releases (signed by GitHub's attestation).

## 📜 Disclosure policy / 披露策略

Once a fix is ready, we will:

1. Publish a security advisory on GitHub with full details.
2. Add a `### Security` section to [CHANGELOG.md](CHANGELOG.md).
3. Tag the fix commit with `security` in addition to `fix`.
4. Credit the reporter (unless they prefer to stay anonymous).

Thank you for helping keep **dsh-client** and its users safe. 🙏
