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
