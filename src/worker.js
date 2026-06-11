import { createUser, listUsers, loginWithPassword } from "./services/user-service.js";
import { json, methodNotAllowed, notFound } from "./utils/response.js";
import { sign, verify } from "./utils/jwt.js";

function parseJsonSafe(request) {
  return request.json().catch(() => null);
}

const JWT_SECRET = "your-secret-key-at-least-32-chars"; // 实际生产中应从 env.JWT_SECRET 获取

// 不需要 Token 校验的公开路径
const PUBLIC_PATHS = [
  "/",
  "/api/login",
  "/api/register",
  "/api/test"
];

async function getAuthUser(request, env) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];
  const payload = await verify(token, env.JWT_SECRET || JWT_SECRET);
  if (!payload || !payload.userId || !payload.uuid) return null;

  // 检查 KV 中是否存在该 token
  const kv = env.CF_TEST;
  if (kv) {
    const kvToken = await kv.get(`login_tokens:${payload.userId}:${payload.uuid}`);
    if (!kvToken) return null; // Token 已失效（被踢出）
  }

  return payload;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. 静态资源和公开路径处理
    if (pathname === "/" && url.hostname === "t.uu5c.top") {
      if (env.ASSETS) {
        const indexUrl = new URL("/index.html", request.url);
        return env.ASSETS.fetch(new Request(indexUrl, request));
      }
      return notFound();
    }

    // 2. API 鉴权拦截器
    if (pathname.startsWith("/api/")) {
      const isPublic = PUBLIC_PATHS.includes(pathname);

      let authUser = null;
      if (!isPublic) {
        authUser = await getAuthUser(request, env);
        if (!authUser) {
          return json({ ok: false, msg: "请先登录" }, 401);
        }
        // 将用户信息挂载到 request 上方便后续使用（可选）
        request.user = authUser;
      }

      // --- 具体 API 路由处理 ---

      if (pathname === "/api/test") {
        return json({ ok: true, msg: "backend is working" });
      }



      if (pathname === "/api/login") {
        if (request.method !== "POST") return methodNotAllowed();
        const body = await parseJsonSafe(request);
        const username = (body?.username || "").trim();
        const password = (body?.password || "").trim();

        if (!username || !password) {
          return json({ ok: false, msg: "用户名或密码不能为空" }, 400);
        }

        try {
          const user = await loginWithPassword(env.apitest_bind, username, password);
          if (!user) {
            return json({ ok: false, msg: "用户名或密码错误" }, 401);
          }

          const uuid = crypto.randomUUID();
          const payload = {
            userId: user.id,
            username: user.username,
            nick_name: user.nick_name,
            role: user.role,
            uuid: uuid,
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
          };
          const token = await sign(payload, env.JWT_SECRET || JWT_SECRET);

          const kv = env.CF_TEST;
          if (kv) {
            await kv.put(`login_tokens:${user.id}:${uuid}`, token, { expirationTtl: 86400 });
          }

          return json({
            ok: true,
            msg: "登录成功",
            token,
            user: {
              id: user.id,
              username: user.username,
              nick_name: user.nick_name,
              role: user.role
            }
          });
        } catch (err) {
          return json({ ok: false, msg: err.message }, 403);
        }
      }

      if (pathname === "/api/register") {
        if (request.method !== "POST") return methodNotAllowed();
        const body = await parseJsonSafe(request);
        if (!body?.username || !body?.password) {
          return json({ ok: false, msg: "用户名和密码不能为空" }, 400);
        }
        const result = await createUser(env.apitest_bind, body);
        return json({ ok: result.ok, msg: result.msg }, result.status);
      }

      if (pathname === "/api/todos") {
        const db = env.apitest_bind;
        if (!db) return json({ ok: false, msg: "D1 database not configured" }, 500);

        const userId = authUser.userId;

        if (request.method === "GET") {
          const { results } = await db.prepare(
            "SELECT text, completed, created_at AS createdAt, completed_at AS completedAt FROM todos WHERE user_id = ? ORDER BY id DESC"
          ).bind(userId).all();

          return json({
            ok: true,
            data: results.map(r => {
              // 读取时：如果是字符串则转为毫秒数
              const cAt = typeof r.createdAt === 'string' ? new Date(r.createdAt).getTime() : r.createdAt;
              const compAt = typeof r.completedAt === 'string' ? new Date(r.completedAt).getTime() : r.completedAt;
              return {
                text: r.text,
                completed: !!r.completed,
                createdAt: cAt,
                completedAt: compAt
              };
            })
          });
        }

        if (request.method === "POST") {
          const { todos } = await parseJsonSafe(request);
          if (!Array.isArray(todos)) {
            return json({ ok: false, msg: "Invalid todos data" }, 400);
          }

          try {
            const statements = [
              db.prepare("DELETE FROM todos WHERE user_id = ?").bind(userId)
            ];

            for (const todo of todos) {
              // 存储时：将数字毫秒数转为 ISO 字符串，以确保兼容 D1 的 DATETIME 类型
              const cAtStr = todo.createdAt ? new Date(todo.createdAt).toISOString() : new Date().toISOString();
              const compAtStr = todo.completedAt ? new Date(todo.completedAt).toISOString() : null;

              statements.push(
                db.prepare("INSERT INTO todos (user_id, text, completed, created_at, completed_at) VALUES (?, ?, ?, ?, ?)")
                  .bind(userId, todo.text, todo.completed ? 1 : 0, cAtStr, compAtStr)
              );
            }

            await db.batch(statements);
            return json({ ok: true, msg: "同步成功" });
          } catch (err) {
            console.error('D1 Sync Error:', err.message);
            return json({ ok: false, msg: "数据库同步失败: " + err.message }, 500);
          }
        }

        return methodNotAllowed();
      }

      // 管理后台接口额外权限检查
      if (pathname.startsWith("/api/admin/")) {
        if (authUser.role !== 'admin') {
          return json({ ok: false, msg: "无权访问管理接口" }, 403);
        }

        if (pathname === "/api/admin/users") {
          const { users, stats } = await import("./services/user-service.js").then(m => m.getUserSummary(env.apitest_bind));
          return json({ ok: true, data: users, stats });
        }

        if (pathname === "/api/admin/update-status") {
          if (request.method !== "POST") return methodNotAllowed();
          const { userId, status } = await parseJsonSafe(request);
          const result = await import("./services/user-service.js").then(m => m.setUserStatus(env.apitest_bind, userId, status));

          if (status === 1) {
            const kv = env.CF_TEST;
            if (kv) {
              const prefix = `login_tokens:${userId}:`;
              const list = await kv.list({ prefix });
              for (const key of list.keys) {
                await kv.delete(key.name);
              }
            }
          }
          return json(result);
        }

        if (pathname === "/api/admin/delete-user") {
          if (request.method !== "POST") return methodNotAllowed();
          const { userId } = await parseJsonSafe(request);
          const result = await import("./services/user-service.js").then(m => m.deleteUser(env.apitest_bind, userId));

          const kv = env.CF_TEST;
          if (kv) {
            const prefix = `login_tokens:${userId}:`;
            const list = await kv.list({ prefix });
            for (const key of list.keys) {
              await kv.delete(key.name);
            }
          }
          return json(result);
        }
      }

      return notFound();
    }

    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    }

    return notFound();
  }
};
