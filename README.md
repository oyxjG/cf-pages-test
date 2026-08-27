# 个人聚合面板 (Digital Garden & Personal Productivity Hub)

基于 **Cloudflare Workers + D1 + KV + Assets** 的个人专属数字化工作台、生产力看板与多功能极客工具箱。

项目融合了有温度的个人生活节奏（今日待办、习惯打卡、故事心流、时间脉搏、番茄钟工作流）以及随身全能的效率工具矩阵 (Launchpad 启动器)，是专属于个人的每日浏览器启动页与数字花园。

---

## 🌟 核心特色

### 1. 🌿 个人专属控制台 (Sidebar Console)
- **个人名片 (Profile Card)**：展示专属头像、昵称、签名状态，支持极客暗黑/纸质浅色模式一键切换。
- **动态时钟 (Clock Card)**：精准实时走字，结合当前时段智能切换贴心问候语（清晨、上午、午后、夜深）。
- **心流番茄钟 (Pomodoro)**：内置 25/5/15 分钟专注循环，圆环倒计时动画、循环点亮徽标与自定义设置翻转。

### 2. ⚡ 时间脉搏与灵感 (Time Pulse & Daily Quote)
- **每日一言 (Daily Quote)**：接入 Hitokoto API 与经典语录，支持换一句、一键复制与本地收藏。
- **时间进度看板**：
  - 本月剩余工作日与月度进度条。
  - 本年剩余工作日与年份进度条。
  - 下一个法定节假日倒计时与节日徽标。

### 3. 🎯 生活节奏三大核心交互 (Lifestyle Rhythm)
- **今日待办 (Quick Todo)**：
  - 首页即时输入添加、划线勾选完成与删除。
  - 登录后直接与 Cloudflare D1 数据库双向实时同步。
- **日常习惯打卡 (Daily Rituals)**：
  - 追踪每日高频习惯（喝足八杯水、运动健身、阅读章节、早睡早起、心流专注）。
  - 一键打卡动画反馈、当天完成率（如 4/5 完成）与连续坚持天数（Streak 连击）。
- **故事与心流花园 (Story Oasis)**：
  - 精选随笔短文与金句摘录，与一言轮播联动。

### 4. 🚀 随身武器库 (Launchpad 全屏启动器)
- 首页精选 4 大高频工具（Markdown 编辑、Diff 比对、国密 SM2、JSON 格式化）直达。
- 按下 <kbd>Ctrl + K</kbd> / <kbd>Cmd + K</kbd> 随时唤出全屏毛玻璃 Launchpad 启动器，检索全部 **18+ 款开发与日常小工具**。

### 5. 🎮 休闲茶歇室
- 收录经典扫雷、像素飞鸟、灵动萌兔、3D 漫步公路 4 款小游戏，在工作间歇轻松解压。

---

## 📂 项目结构

```text
├── db/
│   └── schema.sql              # D1 数据库建表脚本（users, todos, preferences, snippets）
├── public/                     # 前端静态资源（由 Cloudflare Assets 托管）
│   ├── index.html / js / css   # 个人聚合面板主页与交互驱动
│   ├── login.html / register.html # 用户登录与通行证注册
│   ├── tasks.html / js         # 云端待办中心
│   ├── games.html              # 休闲小游戏茶歇室
│   ├── theme.css / js          # 深浅色纸质质感主题
│   ├── admin/                  # 管理员控制后台
│   ├── game/                   # 独立小游戏专区
│   └── tool/                   # 纯前端实用工具集（Diff、SM2、正则、Markdown等）
├── src/                        # 后端 Cloudflare Worker 源码
│   ├── worker.js               # Worker 路由分发与鉴权
│   ├── services/               # 业务逻辑服务
│   ├── repositories/           # 数据库访问层
│   └── utils/                  # JWT、加密与响应封装
├── wrangler.toml               # Cloudflare Wrangler 配置文件
└── package.json                # 项目依赖与开发脚本
```

---

## 🛠️ 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 初始化本地 D1 数据库
npx wrangler d1 execute apitest_bind --file=./db/schema.sql

# 3. 启动本地开发服务
npm run dev
```
启动后访问 `http://localhost:8787` 即可体验个人聚合面板。
