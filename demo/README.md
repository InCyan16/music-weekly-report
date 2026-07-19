# 音乐日记 · 可运行 Demo

无需 Node.js、无需 Supabase，**一条命令即可运行**。

## 核心交互（与完整版共识一致）

**没有进度条。** 快进 / 后退靠**旋转黑胶唱片**，左右滑动切歌——模拟物理唱机的操作，而非音乐 App 的滑块拖动。

## 快速启动

```bash
cd demo
python3 serve.py
```

浏览器自动打开 http://localhost:3456

或：

```bash
./demo/start.sh
```

## Demo 功能

| 功能 | 说明 |
|------|------|
| 🔍 音乐搜索 | **Spotify API**（需 Next.js 后端 + `.env` 凭据），显示封面与时长 |
| 💿 黑胶播放 | 点击搜索结果显示播放，唱片旋转 + 唱针动画 |
| ↻ 旋转定位 | **旋转唱片**快进 / 后退，无进度条 |
| ↔️ 滑动切歌 | 左右滑动唱片切换播放历史 |
| ⏯ 播放控制 | 播放/暂停、Replay（无上一首/下一首按钮，靠滑动手势） |
| ✅ 有效播放 | 累计播放 30 秒自动计数（短歌 80% 规则） |
| 😊 心情选择 | 「就这样吧」→ 五档心情表情 + 黑胶环选中效果 |
| 📊 周报 | Top 5 唱片环绕唱机、心情统计、分享图导出 |
| 💾 本地存储 | localStorage 保存播放记录和心情 |

## 文件结构

```
demo/
  index.html   # 页面结构（今日/心情/周报 三屏）
  styles.css   # 复古拟物 + 毛玻璃搜索框
  app.js       # 播放逻辑、搜索、统计（纯前端）
  serve.py     # Python 本地服务器
  start.sh     # 一键启动脚本
```

## Spotify 搜索（Demo）

Demo 搜索已连接 Spotify，通过 Next.js 代理 API 获取结果：

1. 复制 `.env.example` → `.env`，填入 [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) 的 `MUSIC_CLIENT_ID` / `MUSIC_CLIENT_SECRET`
2. 启动主应用：`npm run dev`（默认 http://localhost:3000）
3. 启动 Demo：`python3 demo/serve.py`（http://localhost:3456）
4. 在 Demo 搜索框输入歌名即可

Demo 调用 `GET /api/music/search/public`（Client Credentials，开发环境可用）。播放仍为 Demo 测试音，完整 Spotify 播放需使用主应用并连接账户。

## 与完整版的区别

这是**前端 Demo + Spotify 搜索**：
- 搜索来自 Spotify Web API
- 播放使用 Web Audio 测试音（非 Spotify 真实流媒体）
- 数据存在浏览器 localStorage
- 无用户登录

完整版（项目根目录 Next.js 应用）需配置 Node.js + Supabase + Spotify OAuth，可搜索并真实播放。
