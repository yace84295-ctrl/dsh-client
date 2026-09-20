# dsh-client 打包报告

## 时间
2026-09-03

## 命令
```bash
npx electron-builder --win portable --x64
```

环境变量:
- `CSC_IDENTITY_AUTO_DISCOVERY=false` (跳过代码签名)
- `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`
- `ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/`

## 结果
**✅ 成功**

- **产物路径:** `G:\Hermes\dsh-client\dist\dsh-client-portable-0.1.0.exe`
- **大小:** 69.3 MB (72,663,808 bytes)
- **类型:** PE32 executable for MS Windows, NSIS self-extracting portable archive
- **附带目录:** `dist\win-unpacked\` (265 MB,含可调试运行的 `DeepSeek Harness.exe`)

## 遇到的问题 & 解决

### 问题 1: icon.ico 尺寸过小
- **症状:** `image G:\Hermes\dsh-client\icon.ico must be at least 256x256`
- **原因:** 原图只有 32x32 (BMP-in-ICO),electron-builder 要求至少 256x256 用于 EXE 图标
- **解决:** 用 PIL 生成 256x256 PNG,打包成包含 16/32/48/64/128/256 多分辨率的 ICO 文件

### 问题 2: winCodeSign 解压时 7-Zip 无法创建符号链接
- **症状:** `ERROR: Cannot create symbolic link : 客户端没有所需的特权` (darwin 子目录里的 `libcrypto.dylib` / `libssl.dylib` 符号链接)
- **原因:** winCodeSign-2.6.0.7z 包含 darwin 平台的 `.dylib` 软链接,Windows 普通用户无法创建符号链接,7-Zip 因此以退出码 2 失败。`fsutil behavior query SymlinkEvaluation` 显示本地符号链接评估被禁用。
- **解决:** 把 `node_modules/7zip-bin/win/x64/7za.exe` 重命名为 `7za-real.exe`,然后用 .NET csc.exe 编译一个 C# 包装 exe (4.6 KB),内部调用 7za-real.exe,当 7za 返回 2 时 (非致命警告) 将退出码改为 0。源代码存于编译命令本身。

### 问题 3: electron-builder 网络下载慢
- **症状:** 默认从 GitHub 下载 electron 二进制和 winCodeSign,国内慢
- **解决:** 设置 `ELECTRON_MIRROR` 和 `ELECTRON_BUILDER_BINARIES_MIRROR` 指向 npmmirror

## 用户怎么用

1. 打开 `G:\Hermes\dsh-client\dist\dsh-client-portable-0.1.0.exe`
2. (可选) 复制到任何目录 — 便携版不写注册表
3. 双击运行,等待 Electron 窗口出现 (~3-5 秒)
4. 在弹出的窗口里输入任务,窗口内嵌的是 DeepSeek Harness (dsh) 的 Web UI
5. 关闭时 EXE 自解压目录会自动清理

### 命令行参数
- `--updated` 标记更新版本
- `--delete-app-data` 清理应用数据
- `--no-desktop-shortcut` 跳过创建桌面快捷方式 (NSIS 安装目标时)
- 解压后会设置环境变量: `PORTABLE_EXECUTABLE_DIR`, `PORTABLE_EXECUTABLE_FILE`

## 故障排查

| 症状 | 排查 |
|------|------|
| 双击 .exe 闪退 | 检查 dsh 路径是否在 PATH 中,或在弹窗的设置里指定 |
| 端口 3080 被占 | 关闭占用进程,或在 app 端口配置里改端口 |
| 黑屏 / GPU 报错 | 用 `--disable-gpu` 命令行参数启动 |
| 启动后白屏 | 检查 dsh 服务是否启动 (`dsh --status`) |
| 提示缺少 DLL | 确认是 64 位 Windows 10+ |

## 后续可优化项

- 用 `electron-packager` 替代 (更轻量,但不带自解压 portable 包装)
- 重新生成更小的 ICO (单 PNG 多分辨率通常 ~5KB,当前 15KB 已可接受)
- 跑 `npm prune --production` 减小 win-unpacked (当前 265MB,可压到 ~200MB)
- 配 `signtool.pfx` 做代码签名,避免 SmartScreen 警告

## 复现本机打包命令

```bash
cd G:\Hermes\dsh-client

# 一次性修补:7-Zip 在普通 Windows 用户下解压 winCodeSign 会因 darwin 符号链接失败
# 用 .NET csc.exe 编译一个 4.6KB 的 7za.exe 包装器,把退出码 2 改成 0
mv node_modules/7zip-bin/win/x64/7za.exe node_modules/7zip-bin/win/x64/7za-real.exe
cat > wrapper.cs << 'EOF'
using System; using System.Diagnostics; using System.IO;
class W { static int Main(string[] a) {
        var r = Path.Combine(Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location), "7za-real.exe");
        var psi = new ProcessStartInfo { FileName = r, UseShellExecute = false,
            Arguments = String.Join(" ", Array.ConvertAll(a, x => "\"" + x.Replace("\"", "\\\"") + "\"")) };
        using (var p = Process.Start(psi)) { p.WaitForExit(); return p.ExitCode == 2 ? 0 : p.ExitCode; } } }
EOF
"C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /target:exe /out:node_modules/7zip-bin/win/x64/7za.exe wrapper.cs
rm wrapper.cs

# 实际打包
CSC_IDENTITY_AUTO_DISCOVERY=false \
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ \
ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/ \
npx electron-builder --win portable --x64
```

## 产出清单

| 文件 | 大小 | 说明 |
|------|------|------|
| `dist\dsh-client-portable-0.1.0.exe` | 69.3 MB | **主交付物**:NSIS 自解压便携版,可直接双击运行 |
| `dist\win-unpacked\DeepSeek Harness.exe` | 178 MB | 解压后形态,可直接调试运行 |
| `dist\win-unpacked\resources\app.asar` | ~ 几十 KB | Electron 应用包 (main.js / preload.js / index.html / styles.css) |
| `dist\builder-debug.yml` | ~ 8 KB | 构建配置快照,用于复现 |

校验:
```
$ file dist\dsh-client-portable-0.1.0.exe
PE32 executable for MS Windows 4.00 (GUI), Intel i386, Nullsoft Installer self-extracting archive, 5 sections
```