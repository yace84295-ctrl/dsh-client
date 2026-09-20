# dsh-client 推广文合集

三篇面向不同平台的推广文,内容真实、可直接复制发布。发布前请全局替换占位符。

## 文件清单

| 文件 | 平台 | 风格 | 长度 |
|------|------|------|------|
| `article-v2ex-juejin.md` | V2EX(创造者节点)/ 掘金 | 技术深度 + 代码 + 踩坑 | ~2300 字 |
| `article-zhihu-wechat.md` | 知乎专栏(AI Agent)/ 微信公众号 | 故事 + 思考 + 行业观察 | ~2900 字 |
| `article-twitter-weibo-xiaohongshu.md` | Twitter/X、微博、小红书 | 短平快 + 钩子 | 7 条推 + 2 条微博 + 1 篇笔记 |

## 发布前必做

1. **全局替换 `yourname/dsh-client`** → 真实仓库路径(三个文章文件里 GitHub 链接 + 图片链接)。脚本示例:
   ```bash
   grep -rl 'yourname/dsh-client' promo/*.md | xargs sed -i 's|yourname/dsh-client|<你的用户名>/dsh-client|g'
   grep -rl 'USER/REPO' promo/*.md | xargs sed -i 's|USER/REPO|<你的用户名>/dsh-client|g'
   ```
2. **确认截图已就位** — `docs/screenshots/` 下当前实际文件名:
   - `screenshot-light.png`(浅色主界面)
   - `screenshot-dark.png`(深色主界面)
   - `command-palette.png`(命令面板打开态)
   - `about.png`(关于对话框)
3. **确认 Releases 已发布** `dsh-client-portable-0.3.1.exe`,否则 CTA 链接会落到空页面。
4. 核对版本号:三篇均写 v0.3.1、92 MB、124 测试 / 76.5% 覆盖率。若发版前有变动,同步改掉。

## 建议发布顺序与节奏

技术社区先行 → 拿到第一批真实反馈和 star → 再打广域流量,这样后面的文章可以带上「已有 N star / 已修复某问题」这类真实增量。

**Day 1 上午 — V2EX**
发 `article-v2ex-juejin.md` 到「创造者」节点。V2EX 用户会直接挑技术问题,当天要盯回复,尤其是 Electron 体积、iframe 方案、跨平台三个必被问的点。提前想好答案(体积换零依赖、复用上游 UI、进程树清理需重写)。

**Day 1 晚间 — 掘金**
同一篇文,标签打 `AI`、`开源`、`Electron`、`Node.js`。掘金对格式友好度敏感,建议把代码块前后的说明句留足,标题可微调为更具体的版本以避免与 V2EX 完全同题。

**Day 2~3 — 知乎 + 公众号**
发 `article-zhihu-wechat.md`。此时已有 V2EX/掘金的评论素材,可在第六节「桌面化趋势」里补一两句真实读者观点,可信度更高。知乎投「AI Agent」「DeepSeek」「开源软件」话题;公众号原文不动即可,首图用浅色主界面截图。

**Day 3~4 — 社交平台收尾**
发 `article-twitter-weibo-xiaohongshu.md`:
- Twitter thread 7 条,每条已控制在 280 字符内,**可独立成推**;第 1、4、7 条也适合单独二次发。
- 微博两条:第二条可作为第一条的评论追加,保持 140 字内。
- 小红书按文中的 4 张配图建议出图,标题勿超 20 字,标签用满 10 个。

## 内容口径统一(避免自相矛盾)

- 定位:**桌面壳**,不增加任何 AI 能力,AI 全在上游 dsh。
- 上游归属:dsh 是 DeepSeek 团队开源作品,目前 Dev Preview,三篇都致谢。
- 平台现状:仅 Windows 10/11;macOS/Linux 在 roadmap,原因是进程树清理需从 `taskkill` 改为进程组。
- 体积口径:92 MB 换取终端用户零依赖(不装 Node);源码开发才需要 Node 22+。
- 两个反复出现的踩坑点(可作为评论区素材复用):
  1. 就绪判据必须用 HTTP 轮询端口,不能用日志关键字;
  2. Windows 下 `child.kill()` 杀不掉 `cmd.exe /c` 的孙进程,必须 `taskkill /pid <pid> /f /t`。

## 语气红线

不写「颠覆」「最强」「必备神器」这类词;不承诺未做的功能(auto-update 目前是 stub,必须写明);所有数字都以仓库实际状态为准,发版有变动先改文再发。
