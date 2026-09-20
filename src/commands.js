// src/commands.js
// Command palette registry. Pure data + a tiny fuzzy matcher, no DOM.
// Renderer consumes `commands` and filters by `fuzzySearch(query, commands)`.

'use strict';

// Each command: { id, label, category, keywords, action }
// `action` is a string opcode — the renderer turns opcodes into IPC calls.
// Keeping actions as strings makes the registry serializable and trivially testable.

const commands = [
  {
    id: 'app.quit',
    label: '退出 dsh-client',
    category: '应用',
    keywords: 'quit exit close 退出',
    action: 'dsh:quit',
    accelerator: 'Ctrl+Shift+Q',
  },
  {
    id: 'app.reload',
    label: '刷新 dsh Web UI',
    category: '应用',
    keywords: 'reload refresh',
    action: 'dsh:reload',
    accelerator: 'Ctrl+R',
  },
  {
    id: 'app.openInBrowser',
    label: '在系统浏览器中打开 dsh',
    category: '应用',
    keywords: 'browser external open web',
    action: 'dsh:openInBrowser',
  },
  {
    id: 'app.about',
    label: '关于 dsh-client',
    category: '帮助',
    keywords: 'about version info 关于',
    action: 'dsh:open-about',
  },

  {
    id: 'window.toggle',
    label: '显示 / 隐藏主窗口',
    category: '窗口',
    keywords: 'hide show toggle window 隐藏',
    action: 'dsh:hide',
    accelerator: 'Ctrl+Shift+D',
  },
  {
    id: 'window.minimize',
    label: '最小化主窗口',
    category: '窗口',
    keywords: 'minimize window',
    action: 'dsh:minimize',
  },
  {
    id: 'window.openCommandPalette',
    label: '打开命令面板',
    category: '窗口',
    keywords: 'palette command search',
    action: 'dsh:open-command-palette',
    accelerator: 'Ctrl+K',
  },
  {
    id: 'window.openLogs',
    label: '查看日志…',
    category: '窗口',
    keywords: 'logs log viewer 日志',
    action: 'dsh:open-log-viewer',
    accelerator: 'Ctrl+Shift+L',
  },

  {
    id: 'theme.toggle',
    label: '切换深色 / 浅色主题',
    category: '主题',
    keywords: 'theme dark light toggle 主题 切换',
    action: 'dsh:toggle-theme',
    accelerator: 'Ctrl+Shift+T',
  },
  {
    id: 'theme.dark',
    label: '切换到深色主题',
    category: '主题',
    keywords: 'theme dark 深色',
    action: 'dsh:set-theme:dark',
  },
  {
    id: 'theme.light',
    label: '切换到浅色主题',
    category: '主题',
    keywords: 'theme light 浅色',
    action: 'dsh:set-theme:light',
  },

  {
    id: 'screenshot.take',
    label: '截图保存为 PNG',
    category: '工具',
    keywords: 'screenshot capture png 截图',
    action: 'dsh:takeScreenshot',
    accelerator: 'Ctrl+Shift+S',
  },
  {
    id: 'dsh.reload',
    label: '重启 dsh 子进程',
    category: 'dsh',
    keywords: 'dsh restart reload 重启',
    action: 'dsh:reloadDsh',
    accelerator: 'Ctrl+Shift+R',
  },
  {
    id: 'dsh.pickPath',
    label: '选择 dsh 可执行文件路径…',
    category: 'dsh',
    keywords: 'dsh path bin exe 选择路径',
    action: 'dsh:pick-dsh-path',
  },
  {
    id: 'dsh.pickCwd',
    label: '选择 dsh 工作目录…',
    category: 'dsh',
    keywords: 'dsh cwd directory 工作目录',
    action: 'dsh:pick-dsh-cwd',
  },
  {
    id: 'dsh.checkUpdate',
    label: '检查更新',
    category: 'dsh',
    keywords: 'update version 检查 更新',
    action: 'dsh:checkUpdate',
  },
  {
    id: 'dsh.clearLogs',
    label: '清空日志缓冲',
    category: 'dsh',
    keywords: 'logs clear 清空',
    action: 'dsh:clearLogs',
  },
];

// Fuzzy match: every char in `query` must appear in `haystack` in order.
// Returns a numeric score (higher = better) or 0 for no match.
// Scoring bonuses:
//   - +5 per consecutive match (run-length)
//   - +3 if matched in the id portion (high signal)
//   - +2 if matched at the start of a word
//   - +1 per occurrence beyond the first
function fuzzyScore(query, haystack, idHaystack = '') {
  if (!query) return 1;
  const q = String(query).toLowerCase();
  const h = String(haystack).toLowerCase();
  const id = String(idHaystack).toLowerCase();
  let qi = 0;
  let score = 0;
  let lastMatch = -2;
  for (let i = 0; i < h.length && qi < q.length; i++) {
    if (h[i] === q[qi]) {
      // Consecutive bonus
      const run = i - lastMatch === 1 ? 5 : 1;
      // Id bonus — does the id substring also contain q at this relative position?
      const inId = id.includes(q);
      const idBonus = inId ? 3 : 0;
      // Word-start bonus (previous char is space / hyphen / dot)
      const prev = i > 0 ? h[i - 1] : ' ';
      const wordBonus = /[\s\-_./]/.test(prev) ? 2 : 0;
      score += run + idBonus + wordBonus;
      lastMatch = i;
      qi++;
    }
  }
  return qi === q.length ? score : 0;
}

function fuzzySearch(query, list = commands) {
  if (!query) return list.slice();
  const scored = list
    .map((cmd) => {
      const idPart = `${cmd.id}`;
      const labelAndKw = `${cmd.label} ${cmd.keywords || ''}`;
      // Score twice and take max so id matches always win
      const a = fuzzyScore(query, `${labelAndKw} ${idPart}`, idPart);
      const b = fuzzyScore(query, labelAndKw, idPart);
      return { cmd, score: Math.max(a, b) };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .map((x) => x.cmd);
  return scored;
}

module.exports = { commands, fuzzySearch, fuzzyScore };
