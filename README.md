# 音乐日记 Music Diary

> 以黑胶唱片和复古拟物设计为核心视觉语言的个人音乐日记网站。

你每天搜索、聆听真实音乐，系统自动记录你真正听过的歌曲；每周日，你的音乐时光凝结成一份黑胶周报——可交互、可保存、可分享。

概念草图见 [`public/reference/music-diary-brief.png`](public/reference/music-diary-brief.png)。该图是概念参考，不逐像素照抄，但保留以下核心意象：

- 黑胶唱片
- 复古拟物唱机
- 音乐搜索列表
- 左右滑动切歌
- 每日心情选择
- 每周 Top 5 唱片报告
- 动态周报
- 可保存和分享的静态周报图片

---

## 目录

- [产品目标](#产品目标)
- [核心体验](#核心体验)
- [最重要的产品规则](#最重要的产品规则)
- [核心交互原则：旋转唱片，而非进度条](#核心交互原则旋转唱片而非进度条)
- [真实音乐播放](#真实音乐播放)
- [有效播放次数](#有效播放次数)
- [播放 Session 状态](#播放-session-状态)
- [页面结构](#页面结构)
- [音乐搜索](#音乐搜索)
- [今日播放历史](#今日播放历史)
- [黑胶唱片播放器](#黑胶唱片播放器)
- [左右滑动切歌](#左右滑动切歌)
- [播放器控制](#播放器控制)
- [结束当天聆听](#结束当天聆听)
- [心情选择](#心情选择)
- [周报统计](#周报统计)
- [心情统计](#心情统计)
- [周报动态交互](#周报动态交互)
- [分享图片](#分享图片)
- [视觉方向](#视觉方向)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [本地运行](#本地运行)
- [Demo 模式](#demo-模式)
- [Supabase 配置](#supabase-配置)
- [音乐 Provider 配置](#音乐-provider-配置)
- [环境变量](#环境变量)
- [测试](#测试)
- [Vercel 部署](#vercel-部署)
- [Token 安全](#token-安全)
- [已知限制](#已知限制)
- [音乐版权说明](#音乐版权说明)
- [后续扩展方向](#后续扩展方向)

---

## 产品目标

这是一个**个人音乐日记**，不是音乐播放器，也不是 SaaS 仪表盘。

用户每天可以：

1. **搜索歌曲**
2. **点击搜索结果并真实播放音乐**
3. 在播放器中暂停、继续、旋转唱片定位、重新播放
4. **系统自动记录**用户真实听过的歌曲
5. 用户结束当天的音乐 Session
6. 选择当天听音乐时的心情

网站在**每周日**生成一份音乐周报，展示：

- 本周有效播放次数最多的 **Top 5** 首歌
- Top 5 排名与每首歌的播放次数
- 本周总播放次数、听音乐天数
- 本周心情变化、最常出现的心情、情绪趋势总结
- 动态唱片交互
- 可下载的静态分享图片

**普通首页不直接展示本周歌曲排行榜**——Top 5 在周日才揭晓。

---

## 核心体验

```
搜索音乐
  → 真实播放
  → 自动记录播放行为
  → 结束当天记录
  → 选择心情
  → 周日生成音乐报告
  → 保存和分享
```

用户不能手动「添加歌曲」。页面上不应出现「添加歌曲」「记录这首歌」「加入今日列表」「收藏到今日记录」等按钮。搜索后被点击的歌曲，只有达到**有效播放标准**才计入次数；搜索但未播放、播放不足阈值，均不计数。

---

## 最重要的产品规则

以下规则必须严格遵守：

### 播放与计数

1. **用户不能手动添加歌曲。**
2. 用户搜索歌曲后，点击搜索结果应**直接开始播放**，或进入可明确开始播放的播放器状态。
3. 系统根据**真实播放行为**自动创建播放记录。
4. 搜索结果被点击但没有达到有效播放标准时，**不计入**播放次数。
5. 同一首歌播放多次，就累计多次（每次独立 Playback Session 达标后各计 1 次）。
6. **暂停后继续**播放同一 Session，不算新的播放次数。
7. 在同一 Session 内**旋转唱片定位**，不算新的播放次数，也不伪造累计播放时长。
8. 播放结束后点击 **Replay**，创建新的 Playback Session；达标后计为新的一次播放。
9. 用户切换到其他歌曲，再切回原歌曲并重新播放，创建新的 Session；达标后计为新的一次播放。
10. 浏览器刷新或页面重新打开后，**不得**因播放器恢复状态而自动重复计数。
11. 周报 Top 5 必须按**有效播放次数**排名，而不是搜索次数、点击次数或手动添加次数。
12. 同一首歌通过音乐服务提供的稳定 **Track ID** 识别（如 `spotify:track:xxx`），不能只根据歌曲名称判断。
13. Remix、Live、Acoustic、Remastered、Radio Edit 等不同 Track ID 默认视为不同歌曲。

### 心情与 Session

14. 每位用户每天有一个**最终心情记录**，当天可以修改。
15. 用户完成一次当天 Session 后，当天仍然可以再次回来继续听音乐。
16. 当天再次回来播放的歌曲，继续计入**同一天**。
17. 用户当前播放 Session 和当天播放历史可以查看。
18. 过去几天的完整歌曲播放记录，在周报生成前**不需要公开展示**。

---

## 核心交互原则：旋转唱片，而非进度条

> 详见 [`docs/DESIGN_PRINCIPLES.md`](docs/DESIGN_PRINCIPLES.md)

这是本产品**最核心的交互共识**，区别于所有常规音乐 App：

**本项目不使用传统音乐 App 的进度条 / 滑块。**

在物理世界里，你不会拖动一条线来跳转歌曲位置——你会**用手旋转黑胶唱片**。交互必须延续这种细腻的拟物化动作，而不是退化成通用播放器 UI。

| 手势 | 行为 |
|------|------|
| **旋转唱片（顺时针）** | 快进 |
| **旋转唱片（逆时针）** | 后退 |
| **左右滑动唱片** | 切换当天播放历史中的歌曲 |
| **点击播放按钮** | 开始 / 暂停 |

### 界面应有与不应有

- **有**：当前时间 / 总时长文字（如 `1:23 / 3:45`）
- **无**：`<input type="range">` 进度条、可拖动的播放头
- **无**：「上一首 / 下一首」按钮组（切歌靠滑动手势 + 底部「下一首歌」）

旋转唱片改变播放位置**不计入**累计播放时间。只有真实播放（含暂停后继续）才计入有效播放次数。

---

## 真实音乐播放

网站必须支持**真实音乐播放**——不能只播放视觉动画，也不能只模拟播放状态。

### 生产环境：Spotify

生产环境使用 **Spotify Web Playback SDK** + **Spotify Web API**，采用 Provider Adapter 架构（`lib/music/providers/`），避免把某一平台的 SDK 逻辑写死在所有页面中。

| 能力 | 说明 |
|------|------|
| 稳定歌曲 ID | `spotify:track:{id}` |
| 授权 | OAuth 2.0 Authorization Code with PKCE |
| 必要 Scopes | `streaming`, `user-read-email`, `user-read-private`, `user-read-playback-state`, `user-modify-playback-state` |
| 完整播放 | **需要 Spotify Premium 账户** |
| 非 Premium | 明确提示，不伪装成可播放，不静默降级成假播放 |

网站账户（Supabase Auth）与音乐平台账户（Spotify）**需要区分**。用户需先登录网站，再连接音乐平台。Token 加密存储在服务端，不暴露给客户端。

### 开发环境：Mock Provider

本地开发、自动测试、UI 演示使用 Mock Provider，页面明确显示 **「Development Playback Mode」**。生产环境**不能**用 Mock 假装真实播放。

---

## 有效播放次数

为避免用户只点击一首歌一秒钟就被统计为听过，系统实现「有效播放」规则。

一首歌在一个独立 **Playback Session** 中满足以下**任一条件**后，计为一次有效播放：

- 实际累计播放时间达到 **30 秒**
- 对于总时长不足 30 秒的歌曲，播放达到歌曲总时长的 **80%**
- 歌曲**自然播放到结尾**

### 累计的是真实播放时间，不是位置

统计的是**累计实际播放时间**，不是唱片旋转位置，也不是进度条位置。

例如：

- 用户从 0 秒播放到 15 秒 → 暂停 → 继续播放 15 秒 → 累计 30 秒 → **计为一次有效播放**

但以下情况**不能直接计数**：

- 用户旋转唱片从 0 秒定位到 2 分钟，实际只播放了 3 秒 → **不计为有效播放**

### 每个 Session 最多计数一次

每次创建 Playback Session 时生成唯一 `session_id`。达到有效播放条件时向服务端提交 qualify 请求。服务端通过 `listening_entries.playback_session_id` 唯一约束保证幂等——同一个 session 只能生成一条有效播放记录。

### Playback Session 创建条件

- 用户第一次播放某首歌
- 用户播放另一首歌
- 用户点击 Replay
- 歌曲结束后重新播放
- 用户重新搜索并重新播放同一首歌
- 用户从播放历史重新打开某首歌并开始新播放

### 不创建新 Session 的行为

- 暂停 / 恢复播放
- 调节音量
- 同一 Session 内旋转唱片定位
- 页面短暂失焦
- 播放缓冲

---

## 播放 Session 状态

请区分以下概念：

| 概念 | 说明 |
|------|------|
| **Search Result** | 只是搜索结果，不代表播放过 |
| **Playback Session** | 用户开始播放某首歌后创建的一次独立播放过程 |
| **Valid Play** | Playback Session 达到有效播放条件后生成的一次播放记录 |
| **Daily Listening Session** | 用户当天打开网站的一次整体使用过程，可包含多首歌和多个 Playback Session |

系统维护：当前歌曲、是否播放、当前进度、当前 Session ID、累计真实播放毫秒数、是否已计为有效播放、当天播放历史、播放器错误、音乐账户连接状态等。

累计播放时间基于播放器状态事件、`performance.now()`、播放与暂停的时间差、页面可见性状态——不简单依赖 `setInterval` 每秒加一。

---

## 页面结构

| 路径 | 页面 | 核心内容 |
|------|------|----------|
| `/` | Landing | 产品名、黑胶视觉、「开始聆听」、登录入口 |
| `/login` | 登录 | Magic Link、Google 登录 |
| `/connect-music` | 连接音乐账户 | Spotify 授权、连接状态、Premium 提示 |
| `/today` | 今日音乐 | 搜索、黑胶播放器、播放历史、「结束今天的聆听」 |
| `/today/mood` | 心情选择 | 五档心情表情 |
| `/week` | 本周进度 | 听音天数、播放次数、心情天数；**不显示 Top 5** |
| `/report/[weekId]` | 周报 | Top 5、动态唱片、心情统计、分享图 |
| `/reports` | 历史报告 | 已生成的历史周报列表 |
| `/settings` | 设置 | 时区、显示名称、退出登录 |

---

## 音乐搜索

- 支持歌曲名、歌手名、专辑名搜索
- 最少输入 2 个字符，300ms debounce，取消旧请求
- 支持键盘上下选择、Enter 播放、Escape 关闭
- Loading Skeleton、无结果状态、错误状态、重试按钮

搜索结果每项显示：专辑封面、歌曲名、歌手、专辑、时长、是否可播放、当前是否正在播放。

- **点击可播放歌曲** → 开始真实播放、创建新 Playback Session、更新唱片 UI、关闭搜索面板
- **点击不可播放歌曲** → 不创建 Session、显示「当前歌曲暂不可播放」、不记录次数

---

## 今日播放历史

用户可以查看**当天**的播放历史，包含每次独立 Playback Session。

推荐 UI：主界面显示**最近播放顺序**（如 Song A → Song B → Song A → Song C），后台保留全部 Session。

从播放历史点击某首歌 → 创建**新的** Playback Session → 真实开始播放 → 达标后再计数。播放历史不是「添加列表」，也不是固定播放队列。

---

## 黑胶唱片播放器

### 视觉概念

- 当前歌曲是一张黑胶唱片，位于中央唱机
- 歌曲播放时唱片旋转，暂停时平滑减速停止
- 唱针根据播放状态移动
- 精致平面拟物风格，不需要真实 3D

### 播放状态动画

| 状态 | 表现 |
|------|------|
| Loading | 唱片轻微等待动画，不假装正在播放 |
| Playing | 唱片持续旋转，唱针落下 |
| Paused | 唱片平滑减速停止，唱针保持或轻微抬起 |
| Ended | 唱片停止，显示 Replay，不自动无限循环 |
| Error | 唱片停止，友好错误提示 + 重试 |
| Buffering | 保持当前界面，轻量加载状态，不重复创建 Session |

---

## 左右滑动切歌

- **向左滑动** → 切换到下一条播放历史
- **向右滑动** → 切换到上一条播放历史
- 拖动距离不足时回弹
- 支持鼠标、触摸，以及按钮替代方案
- 不影响页面纵向滚动

拖动完成后**自动开始播放**，并创建新的 Playback Session（像切换黑胶唱片一样切歌）。只有拖动超过阈值才触发；回弹时不切歌。当只有一条播放历史时，滑动仅回弹。

> 旋转唱片 = 快进 / 后退；左右滑动 = 切歌。两种手势不混淆。

---

## 播放器控制

提供：播放、暂停、继续、Replay、音量、静音、当前歌曲信息。

**不提供**：进度条、可拖动滑块。

Replay 行为：结束后或播放中点击 Replay → 结束当前 Session（未达标不计数）→ 创建新 Session → 从 0 开始播放 → 达标后新增一次记录。

---

## 结束当天聆听

用户点击「**结束今天的聆听**」：

1. 暂停当前播放器
2. 保留当前有效播放记录
3. 当前 Session 未达标不强制计数
4. 显示确认层：「今天你听了 N 次音乐，准备记录此刻的心情吗？」（N = 有效播放次数）

- 当天没有任何有效播放 → **不允许**进入心情页，提示「先完整听一会儿音乐，再记录今天的心情吧。」
- 有有效播放 → 确认后进入心情选择页

结束操作不是永久锁定，用户当天仍可回来继续听。

---

## 心情选择

问题：「你今天听音乐时的心情如何？」

| 标签 | 分值 | 中文 |
|------|------|------|
| `very_happy` | 5 | 非常开心 |
| `happy` | 4 | 开心 |
| `calm` | 3 | 平静 |
| `low` | 2 | 低落 |
| `sad` | 1 | 难过 |

五个表情、Hover / Selected 状态、键盘支持。选中后表情放大，外围出现类似黑胶中心环的圆环并轻微旋转。

完成后 upsert 当天心情。如果是周日，进入周报生成流程；否则进入本周进度页。

---

## 周报统计

统计范围：当前用户、用户本地时区、**周一 00:00 至周日 23:59**。

Top 5 按有效播放记录统计，排序规则：

1. `validPlayCount` 降序
2. `lastPlayedAt` 降序
3. `firstPlayedAt` 升序
4. `externalId` 作为稳定兜底排序

每首 Top Song 包含：rank、歌曲信息、validPlayCount、firstPlayedAt、lastPlayedAt。

本周报告还统计：总有效播放次数、不同歌曲数量、听音乐天数、有心情记录的天数、平均每日播放次数、播放最多的一天、第一名歌曲占总播放比例。

周报采用**按需生成**并保存快照到 `weekly_reports`。当前周允许更新覆盖；过去周的历史报告默认不自动变化。

---

## 心情统计

计算：心情记录天数、平均心情分数、最常见心情、最高 / 最低心情日、每日心情趋势、周初与周末的变化。

情绪总结使用**规则生成**（不接入大模型），基于真实数据，数据不足时使用谨慎描述：

- 1 天：「本周目前记录了 1 天心情。」
- 2–3 天：不做明确长期判断
- 4 天以上：可生成基础趋势判断

---

## 周报动态交互

### 桌面端

- 中央是一台唱机
- Top 5 唱片围绕唱机错落分布，显示排名、歌名、播放次数
- 旁边显示心情统计
- Hover 唱片：放大、提升层级、轻微旋转，其他唱片淡化
- 点击唱片：其他淡出，当前唱片移至中央放大，显示完整信息与占比

### 移动端

- 中央唱片 + 横向滑动 Top 5
- 点击后展开详情

使用 Framer Motion，支持 `prefers-reduced-motion`。

---

## 分享图片

独立 `ShareCard` 组件，不直接截图动态页面。

- 尺寸：1080 × 1350、1080 × 1080
- 内容：产品名、周报日期、Top 5、第一名重点展示、播放统计、心情关键词、情绪总结、网站地址
- 导出高清 PNG，字体加载完成后再生成
- 外部封面通过服务端图片代理处理 CORS

---

## 视觉方向

**关键词**：黑胶、唱机、复古、拟物、手绘感、编辑设计、独立音乐杂志、温暖、克制、有趣但不幼稚。

**建议**：米白纸张背景、黑色唱片、暖橙或暖黄强调色、深灰文字、纸张颗粒、唱片纹理、手绘线条、错位编辑排版、大标题、复古印刷感。

**避免**：企业 SaaS、大量卡片 Dashboard、蓝紫渐变、赛博朋克、游戏 UI、过度玻璃拟态、过度写实 3D、过度圆角、复杂霓虹灯。

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router)、TypeScript |
| 样式 | Tailwind CSS、Framer Motion |
| 后端 | Supabase (PostgreSQL、Auth、Storage) |
| 状态 | Zustand |
| 表单 | React Hook Form + Zod |
| API | Server Actions / Route Handlers |
| 测试 | Vitest、Testing Library、Playwright |
| 部署 | Vercel |

音乐播放采用 **Provider Adapter** 架构：

```
lib/music/
  types.ts          # Track, PlaybackState, MusicPlaybackProvider
  provider.ts       # 工厂方法
  providers/
    spotify.ts      # 生产环境
    mock.ts         # 开发 / 测试
```

---

## 项目结构

```
app/                          # 页面与 API 路由
  page.tsx                    # Landing
  login/                      # 登录
  connect-music/              # 音乐账户连接
  today/                      # 今日聆听
  today/mood/                 # 心情选择
  week/                       # 本周进度
  report/[weekId]/            # 周报详情
  reports/                    # 历史报告
  settings/                   # 设置
  api/
    music/                    # 搜索、授权、播放
    playback/session/         # start / progress / end / qualify
    reports/                  # 周报生成
    image-proxy/              # 封面 CORS 代理

components/
  music/                      # 搜索、黑胶、唱机、播放历史
  mood/                       # 心情选择器
  report/                     # 周报、ShareCard
  today/                      # 今日页客户端
  week/                       # 本周进度

lib/
  music/providers/            # Spotify + Mock
  playback/                   # Session 管理、有效播放阈值、时间累计
  reports/                    # Top 5、心情统计、周报生成
  dates/                      # 时区、周计算
  supabase/                   # 客户端
  security/                   # Token 加密

stores/                       # player-store (Zustand)
supabase/migrations/          # 数据库 Schema + RLS
tests/                        # 单元、集成、E2E
demo/                         # 纯前端可运行 Demo（无需 Node.js）
docs/                         # 设计共识文档
public/reference/             # 概念草图
```

---

## 本地运行

### 方式一：纯前端 Demo（最快体验）

无需 Node.js、Supabase、Spotify，一条命令即可：

```bash
cd demo
python3 serve.py
# → http://localhost:3456
```

Demo 实现了核心交互（旋转唱片、滑动切歌、心情、周报），使用 Mock 音频。详见 [`demo/README.md`](demo/README.md)。

### 方式二：完整版 Next.js

**前置要求**：Node.js 18+、Supabase 项目、Spotify Developer 账户（生产播放）

```bash
npm install
cp .env.example .env.local
# 填入 Supabase 与 Spotify 配置
# 执行 supabase/migrations/001_initial_schema.sql

# 开发模式（Mock，无需 Spotify）
NEXT_PUBLIC_USE_MOCK_MUSIC_PROVIDER=true npm run dev

# 生产模式（真实 Spotify 播放）
npm run dev
```

访问 http://localhost:3000

---

## Demo 模式

```env
NEXT_PUBLIC_USE_MOCK_MUSIC_PROVIDER=true
```

- 页面显示 **「Development Playback Mode」**
- 使用 Web Audio 测试音 + 内置歌曲
- 仅用于本地开发、自动测试、UI 演示、CI
- **生产构建不会自动启用 Mock**
- 未配置真实 Provider 时显示配置错误，不伪装播放

---

## Supabase 配置

1. 在 [Supabase](https://supabase.com) 创建项目
2. 获取 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. 在 Settings → API 获取 `SUPABASE_SERVICE_ROLE_KEY`（**仅服务端**）
4. 执行迁移：`supabase/migrations/001_initial_schema.sql`
5. 配置 Auth：
   - 启用 Email Magic Link
   - 可选 Google OAuth
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`

### 数据表

| 表 | 用途 |
|----|------|
| `profiles` | 用户信息、时区 |
| `music_connections` | 音乐平台连接状态（Token 加密存储） |
| `songs` | 歌曲元数据（source + external_id 唯一） |
| `playback_sessions` | 每次独立播放 Session |
| `listening_entries` | 有效播放记录（每 Session 最多 1 条） |
| `daily_moods` | 每日心情（user + local_date 唯一） |
| `weekly_reports` | 周报快照（user + week_start 唯一） |

所有表启用 RLS，用户只能访问自己的数据。

---

## 音乐 Provider 配置

### Spotify Developer

1. 访问 [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. 创建应用，获取 Client ID 和 Client Secret
3. 设置 Redirect URI：
   - 本地：`http://localhost:3000/api/music/callback`
   - 生产：`https://your-domain.vercel.app/api/music/callback`
4. 启用 Web Playback SDK

### 播放要求

- **Spotify Premium** 才能完整播放
- 用户需在浏览器中与播放器交互后才能开始（自动播放策略）
- 未连接 / 无 Premium / 授权失败时**明确提示**，不静默降级

---

## 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端密钥（Token 存储） | ✅ |
| `MUSIC_PROVIDER` | 音乐服务（`spotify`） | 生产 |
| `MUSIC_CLIENT_ID` | Spotify Client ID | 生产 |
| `MUSIC_CLIENT_SECRET` | Spotify Client Secret | 生产 |
| `MUSIC_REDIRECT_URI` | OAuth 回调地址 | 生产 |
| `NEXT_PUBLIC_APP_URL` | 应用 URL | ✅ |
| `NEXT_PUBLIC_USE_MOCK_MUSIC_PROVIDER` | 启用 Mock 模式 | 开发 |
| `PLAYBACK_PROGRESS_UPDATE_INTERVAL_MS` | 播放进度上报间隔（默认 10000） | 可选 |
| `PLAYBACK_DEFAULT_VALID_THRESHOLD_MS` | 有效播放阈值（默认 30000） | 可选 |

Secret 只能服务端使用，不允许 `NEXT_PUBLIC_` 暴露，不提交 `.env.local`。

---

## 测试

```bash
npm run test          # 单元测试（有效播放阈值、Top 5 排名、时区等）
npm run test:e2e      # E2E 测试
npm run lint          # ESLint
npm run typecheck     # TypeScript
npm run build         # 生产构建
```

单元测试覆盖：有效播放规则、暂停累计、旋转定位不计时、Replay 新 Session、Top 5 排序、时区与跨午夜、心情统计、周报快照等。

---

## Vercel 部署

1. 推送代码到 GitHub
2. 在 Vercel 导入项目
3. 配置所有环境变量
4. `MUSIC_REDIRECT_URI` 设为 `https://your-domain.vercel.app/api/music/callback`
5. 在 Spotify Dashboard 添加生产 Redirect URI
6. 在 Supabase 更新 Site URL 和 Redirect URLs
7. 部署

---

## Token 安全

- Spotify Access / Refresh Token **加密存储**在 `music_connections` 表
- 仅服务端（Service Role）可读写 Token
- 客户端通过 `/api/music/token` 获取短期 Access Token（供 Web Playback SDK）
- Token 不出现在前端日志、错误信息或 `NEXT_PUBLIC_` 环境变量中
- 支持 Token 刷新，过期时引导用户重新连接

---

## 已知限制

- 需要 Spotify Premium 才能完整播放
- Spotify Web Playback SDK 不允许未授权的商业用途
- 某些地区 Spotify 服务可用性受限
- 多标签页播放通过 BroadcastChannel 协调，不保证 100% 互斥
- 时区变更、跨午夜播放等边界情况依赖 `profiles.timezone` 正确配置

---

## 音乐版权说明

- 本应用**不存储或分发**音乐文件
- 播放能力完全依赖用户 Spotify 账户权限
- 用户需自行确保符合 Spotify 服务条款
- 未连接或无 Premium 时明确提示，**不伪装播放**

---

## 后续扩展方向

- 支持更多音乐平台（Apple Music、YouTube Music）
- 用户时区与偏好设置增强
- PWA 离线支持
- 社交分享渠道优化
- 更精细的唱针 / 转盘物理动画

---

## 相关文档

- [设计交互共识](docs/DESIGN_PRINCIPLES.md) — 旋转唱片 vs 进度条
- [Demo 使用说明](demo/README.md) — 纯前端快速体验
- [概念草图](public/reference/music-diary-brief.png) — 产品视觉参考
