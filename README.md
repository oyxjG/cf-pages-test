# cf-pages-test

Cloudflare Workers + D1 的用户管理示例项目（前后端分离到结构化目录）。

## 项目结构

- `src/worker.js`：Worker 入口，API 路由与静态资源回退
- `src/services/`：业务逻辑层
- `src/repositories/`：数据库访问层
- `src/utils/`：响应工具
- `public/`：前端静态页面与脚本
- `db/schema.sql`：D1 表结构

## API

- `GET /api/test`
- `POST /api/login`
- `GET /api/users`
- `POST /api/add-user`

## 本地开发

```bash
npm install
npm run dev
```

## 绑定 D1

编辑 `wrangler.toml` 的 `database_id`，或用 wrangler 命令创建并写入。

## 初始化数据库

```bash
npx wrangler d1 execute apitest_bind --file=./db/schema.sql
```

## 部署

```bash
npm run deploy
```

## 注意

示例为了兼容你现有表结构，仍使用明文密码字段；生产环境请改为哈希存储。
