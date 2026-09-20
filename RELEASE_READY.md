# dsh-client 发布准备就绪

**Generated**: 2026-09-03
**Target release**: v0.3.1 — Initial open-source release
**Bundle**: `dsh-client.bundle` (~180 KB, all commits + all files)

---

## ✅ 测试

- 124 个测试用例全部通过(9 个 spec 文件)
- Vitest run ~380ms
- 行覆盖率 76.5%(v8 provider)
- 跑测命令:`npm test` / `npm run test:coverage`

## ✅ 源码

- `src/` — 8 个模块:commands / shortcuts / settings / logger / window-state / dsh-manager / dsh-path / splash / ipc-handlers
- `tests/` — 9 个 spec 文件 + 1 个集成
- `main.js` — 544 行总装(从 v0.3.0 的 860 行下沉到模块)
- `preload.js` — 26 个 `window.dsh.*` IPC 桥
- `index.html` / `styles.css` / `splash.html` — UI 三件套

## ✅ 开源元数据

- `LICENSE`(MIT)
- `README.md`(中英双语 + ⚠️ 占位符警告 + 完整功能列表)
- `CHANGELOG.md`(v0.3.1 / v0.3.0 / v0.2.0 / v0.1.0)
- `CHANGELOG_VERSION.md`(独立 v0.3.1 release notes,可贴进 GitHub Release)
- `CONTRIBUTING.md` / `SECURITY.md` / `CODE_OF_CONDUCT.md`

## ✅ 文档

- `docs/architecture.md` — 模块拓扑与数据流
- `docs/development.md` — 本地开发、调试、热重载
- `docs/keyboard-shortcuts.md` — 9 个快捷键完整说明
- `docs/screenshots/` — 4 张演示截图(`screenshot-light.png` / `screenshot-dark.png` / `command-palette.png` / `about.png`)

## ✅ GitHub Actions

- `.github/workflows/build.yml` — Windows-latest 跑 lint + test + portable 打包
- `.github/workflows/lint.yml` — 单独 lint 任务
- `.github/workflows/release.yml` — tag 触发,`softprops/action-gh-release@v2` 发 draft release
- `.github/ISSUE_TEMPLATE/{bug_report,feature_request,question}.md`
- `.github/PULL_REQUEST_TEMPLATE.md`

## ✅ 工程化

- `.editorconfig` / `.prettierrc.json` / `.prettierignore`
- `eslint.config.js`(扁平配置,ESLint 9+)
- `vitest.config.js`
- `.gitattributes`

## ✅ 发布清单

- `RELEASE_CHECKLIST.md` — 完整 5 阶段 checklist(发布前 1 分钟 / 回电脑后 / 推送 / Release / 推广 / 维护)
- `GITHUB_PUBLISH_GUIDE.md` — 30 秒极简版(3 步)
- `GITHUB_SETUP.md` — 老的准备工作笔记
- `promo/README.md` — 推广节奏
- `promo/article-v2ex-juejin.md` / `promo/article-zhihu-wechat.md` / `promo/article-twitter-weibo-xiaohongshu.md`

## ✅ 打包

- `dist/dsh-client-portable-0.3.1.exe` — 92 MB portable(免安装 / Win 10/11 x64 / Electron 32)
- 构建命令:`npm run build:portable`

## ✅ Git

- 主分支:`main`(原 `master`,已重命名)
- HEAD:`feat: open-source release prep (v0.3.1)`
- 历史:2 个有意义的 commit(v0.3.0 → v0.3.1)

## 📋 回电脑后必做(发布前)

1. **替换 `yourname/dsh-client` 占位符**:
   ```bash
   cd /g/Hermes/dsh-client
   grep -rl 'yourname/dsh-client' . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=coverage \
     | xargs sed -i 's|yourname/dsh-client|<你的GitHub用户名>/dsh-client|g'
   grep -rl 'USER/REPO' . --exclude-dir=node_modules --exclude-dir=.git \
     | xargs sed -i 's|USER/REPO|<你的GitHub用户名>/dsh-client|g'
   ```

2. **创建 GitHub 仓库**(网页,1 分钟):https://github.com/new

3. **推送**:
   ```bash
   git add .
   git commit -m "chore: replace placeholder repo path with real GitHub username"
   git remote add origin https://<TOKEN>@github.com/<你的用户名>/dsh-client.git
   git push -u origin main
   ```

4. **创建 Release**(网页,2 分钟):tag `v0.3.1`,粘贴 `CHANGELOG_VERSION.md`,上传 `dist\dsh-client-portable-0.3.1.exe`

5. **仓库设置**:Discussions 开启 / About 加 topics / branch protection rule 加 CI status check

## 📋 推广(Day 1~4)

- Day 1 上午:V2EX 创造者节点
- Day 1 晚:掘金
- Day 2~3:知乎专栏 + 公众号
- Day 3~4:Twitter thread + 微博 + 小红书