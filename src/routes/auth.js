import { createUser, loginWithPassword } from "../services/user-service.js";
import { json, parseJsonSafe } from "../utils/response.js";
import { sign } from "../utils/jwt.js";
import { JWT_SECRET } from "../middlewares/auth.js";

/**
 * 注册用户认证相关路由
 * @param {import('../utils/router.js').Router} router 
 */
export function registerAuthRoutes(router) {
  // 健康检查接口
  router.get("/api/test", async () => {
    return json({ ok: true, msg: "backend is working" });
  });

  // 用户登录
  router.post("/api/login", async ({ request, env }) => {
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
  });

  // 用户通行证注册
  router.post("/api/register", async ({ request, env }) => {
    const body = await parseJsonSafe(request);
    if (!body?.username || !body?.password) {
      return json({ ok: false, msg: "用户名和密码不能为空" }, 400);
    }
    const result = await createUser(env.apitest_bind, body);
    return json({ ok: result.ok, msg: result.msg }, result.status);
  });
}
