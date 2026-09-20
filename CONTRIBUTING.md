# Contributing to dsh-client

Thanks for your interest in improving **dsh-client**! 🎉
This document covers how to file issues, send pull requests, run the project locally, and follow our coding conventions.

---

## 🐛 Reporting bugs

Before opening a bug report:

1. **Search existing issues** — your bug may already be tracked.
2. **Update to the latest release** — your bug may already be fixed in `main`.
3. **Gather evidence:**
   - Your OS and version (Windows 10 / 11, build number)
   - Node.js version (`node --version`)
   - dsh-client version (visible in About dialog)
   - dsh version (`dsh --version`)
   - Steps to reproduce (as small as possible)
   - Expected vs actual behavior
   - Relevant log lines (from `Ctrl+Shift+L` log viewer, or `%APPDATA%\dsh-client\logs`)
   - Screenshots / GIFs if applicable

Then [open a bug report](../../issues/new?template=bug_report.md).

## 💡 Suggesting features

Feature requests are welcome. Please:

1. Check the [roadmap in CHANGELOG.md](CHANGELOG.md) — it may already be planned.
2. Explain the **problem** you're trying to solve, not just the solution.
3. Describe the **proposed UX** (what would the user see / click?).
4. Mention any **alternatives** you considered.

Use the [feature request template](../../issues/new?template=feature_request.md).

## 🔧 Submitting a pull request

### Workflow

1. **Fork** the repo and create a feature branch:
   ```bash
   git checkout -b feat/my-awesome-thing
   ```

2. **Make your changes.** Keep commits small and focused. One logical change per commit.

3. **Run the local checks** before pushing:
   ```bash
   npm run lint     # eslint
   npm run format   # prettier (writes in place)
   npm test         # node --check on main.js / preload.js
   ```

4. **Verify the build still works** (Windows only):
   ```bash
   npm run build:portable
   ```

5. **Push your branch** and [open a pull request](../../compare).

6. Fill in the PR template:
   - What problem does this PR solve?
   - How did you test it?
   - Are there breaking changes? (API / settings file format / IPC bridge)
   - Screenshots / GIFs for UI changes

### Pull request rules

- ✅ One logical change per PR (split unrelated fixes into separate PRs).
- ✅ Update [CHANGELOG.md](CHANGELOG.md) under the `[Unreleased]` section.
- ✅ Update [README.md](README.md) if you added/changed user-facing behavior.
- ✅ Add screenshots / GIFs for any visible UI change.
- ❌ Do **not** commit `dist/`, `node_modules/`, `*.log`, or your personal `userData/`.
- ❌ Do **not** introduce a new dependency without justification (open an issue first).

## 📐 Coding conventions

### Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/). This enables automatic changelog generation in the future.

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` — new user-facing feature
- `fix` — bug fix
- `docs` — docs only
- `style` — formatting, no code change
- `refactor` — code change with no behavior change
- `perf` — performance improvement
- `test` — add/fix tests
- `chore` — tooling, deps, configs
- `ci` — CI/CD changes

**Examples:**
```
feat(palette): add Ctrl+K shortcut to open command palette
fix(logs): prevent ring-buffer overflow crash when dsh spams stdout
docs(readme): clarify DEEPSEEK_API_KEY setup steps
chore(deps): bump electron to 32.3.0
```

### JavaScript style

- **Prettier** handles formatting (config: `.prettierrc.json`)
  - 2-space indent, single quotes, semicolons, LF line endings, 100-col print width
- **ESLint** enforces correctness (config: `eslint.config.js`)
  - Node + Electron rules recommended
  - We are not strict about style rules — let Prettier handle those
- **No frameworks** in the renderer — `index.html` uses vanilla JS by design. Keep it that way unless there's a strong reason.
- **IPC bridge discipline** — every new IPC channel needs:
  - An `ipcMain.handle(...)` in `main.js`
  - A matching entry in `preload.js`'s `window.dsh` exposure
  - No `nodeIntegration`, no `remote`, no `eval`

### File layout

```
main.js            # Main process: spawn dsh, window, tray, IPC, log buffer, splash
preload.js         # contextBridge — ONLY place that touches ipcRenderer
index.html         # Renderer UI (vanilla JS, no build step)
splash.html        # Standalone splash window
styles.css         # All styling; theme variables at the top
```

### Theme variables

Always use the CSS variables defined in `styles.css`:
```css
color: var(--text-primary);
background: var(--bg-secondary);
border: 1px solid var(--border);
```
Never hard-code colors (except `#FF7A45` brand color and `#0A2540` deep navy on splash).

## 🧪 Testing

We don't have unit tests yet (the project is small enough that manual smoke tests suffice). Manual test plan for new features:

1. **Cold start:** delete `%APPDATA%\dsh-client\` settings, double-click .exe, verify splash → main window transition.
2. **Custom path:** move `dsh.cmd` to a non-standard location, launch, verify the path-picker dialog appears and the new path persists.
3. **Window memory:** resize window, close to tray, relaunch — verify size restores. Maximize, relaunch — verify maximized state restores.
4. **Log viewer:** trigger a dsh reload, open log viewer with `Ctrl+Shift+L`, verify search / copy / clear all work.
5. **Theme:** toggle theme via command palette and via tray, verify settings persist after relaunch.

## 📦 Release process

For maintainers:

1. Update `CHANGELOG.md` — move `[Unreleased]` items into a new dated section.
2. Bump `version` in `package.json` (semver).
3. Commit + push to `main`.
4. Tag: `git tag -a vX.Y.Z -m "vX.Y.Z"` and `git push --tags`.
5. GitHub Actions will build the portable .exe and attach it to a draft release.
6. Edit the release notes and publish.

## 🤔 Questions?

Open an issue with the `question` label, or check existing discussions.
We're a small project — please be patient for a response. 🐢

Thanks again for helping make **dsh-client** better! 💖
