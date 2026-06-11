# cf-pages-test

基于 **Cloudflare Workers + D1 + KV + Assets** 的个人聚合面板（Digital Garden）与多功能工具箱全栈示例项目。

项目集成了前端静态资源部署、后端 API 路由、数据库持久化（D1）、分布式缓存与会话控制（KV）等全套 Cloudflare 生态，支持多用户注册登录、在线待办同步及管理员控制后台。

---

## 🌟 项目特性

- 🛠️ **个人聚合面板**：优雅的前端仪表盘，包含生活节奏卡片（已实现本地 Todo 待办列表）、内置多种实用小工具等。
- ⚙️ **丰富的纯前端工具箱**：
  - 正则表达式测试器 & 正则生成器
  - Diff 文本对比工具
  - JSON 格式化与解析工具
  - Base64 编解码工具
  - 时间戳转换、二维码生成、颜色工具、保质期计算等 10+ 款效率组件。
- 👥 **用户管理系统**：支持用户注册、登录、自动生成 JWT Token 校验。
- ☁️ **云端待办同步**：登录后可访问“云端待办”页面，自动将本地待办与 D1 数据库进行双向同步。
- 🔑 **安全会话管理**：
  - 用户密码使用 `SHA-256` 算法哈希加密后存储于数据库。
  - 使用 Cloudflare KV 缓存登录 Token，支持状态实时校验。
- 👑 **后台管理面板**：
  - 仅限 `admin` 角色的用户访问。
  - 支持查看全局用户统计与用户列表。
  - 支持启用/禁用用户。当禁用或删除用户时，通过 KV 立即清除该用户的所有在线会话（“一键强制下线”）。

---

## 📂 项目结构

```text
├── db/
│   └── schema.sql              # D1 数据库建表脚本（含 users 和 todos 表）
├── public/                     # 前端静态资源（由 Cloudflare Assets 托管）
│   ├── index.html / js / css   # 首页（聚合面板）
│   ├── login.html / register.html # 注册与登录页面
│   ├── tasks.html / js         # 云端待办管理页面
│   ├── theme.css / js          # 深浅色主题切换支持
│   ├── admin/                  # 管理员控制后台页面
│   └── tool/                   # 纯前端实用工具集（Diff 对比、正则等）
├── src/                        # 后端 Worker 源码
│   ├── worker.js               # Worker 主入口（路由分发、静态资源兜底与鉴权拦截）
│   ├── services/               # 业务逻辑层（如登录、注册、状态控制）
│   ├── repositories/           # 数据库访问层（操作 D1）
│   └── utils/                  # 辅助工具（JWT 编解码、响应封装、SHA-256 加密）
├── wrangler.toml               # Wrangler 部署与资源绑定配置文件
└── package.json                # 项目依赖与开发脚本
```

---

## 📡 API 路由设计

后端 API 主入口为 `/api/*`，具备鉴权拦截器，对非公开接口验证 `Authorization: Bearer <token>` 请求头。

### 🔓 公开接口 (无需 Token)
- `GET  /api/test` — 测试后端服务连通性。
- `POST /api/login` — 用户登录。验证密码，成功后发放 JWT 并在 KV 中注册会话，返回用户信息和 Token。
- `POST /api/register` — 用户注册。密码经 SHA-256 哈希加密后存入 D1。

### 🔒 认证接口 (需 Token)
- `GET  /api/todos` — 获取当前用户的云端待办列表。
- `POST /api/todos` — 批量同步保存当前用户的待办列表到 D1。

### 👑 管理员接口 (需 admin 角色)
- `GET  /api/admin/users` — 获取所有用户列表及数据统计（注册总数、激活数、今日新增）。
- `POST /api/admin/update-status` — 启用/停用指定用户。若停用，则同步清除 KV 会话使其失效强制下线。
- `POST /api/admin/delete-user` — 逻辑删除指定用户并清除 KV 会话。

---

## 🛠️ 本地开发

### 1. 安装依赖
```bash
npm install
```

### 2. 配置与绑定
在 `wrangler.toml` 中配置你的 D1 数据库与 KV 命名空间绑定信息：
```toml
[[d1_databases]]
binding = "apitest_bind"
database_name = "apitest"
database_id = "你的-d1-database-id"

[[kv_namespaces]]
binding = "CF_TEST"
id = "你的-kv-namespace-id"
```

### 3. 初始化本地数据库
运行 Wrangler 命令利用本地 D1 模拟器执行 SQL 初始化表结构：
```bash
npx wrangler d1 execute apitest_bind --file=./db/schema.sql
```

### 4. 启动开发服务器
```bash
npm run dev
```
启动后可在浏览器访问控制台输出的本地服务地址（如 `http://localhost:8787`）。

---

## 🚀 部署上线

将项目一键发布到 Cloudflare Pages / Workers 生态中：

### 1. 部署项目
```bash
npm run deploy
```

### 2. 初始化线上生产数据库
使用 `--remote` 参数将表结构应用到 Cloudflare 云端 D1 数据库：
```bash
npx wrangler d1 execute apitest_bind --remote --file=./db/schema.sql
```

