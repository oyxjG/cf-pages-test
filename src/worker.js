import { createUser, listUsers, loginWithPassword } from "./services/user-service.js";
import { json, methodNotAllowed, notFound } from "./utils/response.js";

function parseJsonSafe(request) {
  return request.json().catch(() => null);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === "t.uu5c.top" && url.pathname === "/") {
      if (env.ASSETS) {
        const indexUrl = new URL("/index.html", request.url);
        return env.ASSETS.fetch(new Request(indexUrl, request));
      }

      return notFound();
    }

    if (url.pathname === "/api/test") {
      return json({ ok: true, msg: "backend is working" });
    }

    if (url.pathname === "/api/login") {
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
        return json({ ok: true, msg: "登录成功", user });
      } catch (err) {
        return json({ ok: false, msg: err.message }, 403);
      }
    }

    if (url.pathname === "/api/register") {
      if (request.method !== "POST") return methodNotAllowed();

      const body = await parseJsonSafe(request);
      if (!body?.username || !body?.password) {
        return json({ ok: false, msg: "用户名和密码不能为空" }, 400);
      }

      const result = await createUser(env.apitest_bind, body);
      return json({ ok: result.ok, msg: result.msg }, result.status);
    }

    // --- 管理后台接口 (简易权限检查) ---
    if (url.pathname.startsWith("/api/admin/")) {
      // 实际项目中这里应该检查 JWT Token，这里暂时通过路径区分逻辑
      if (url.pathname === "/api/admin/users") {
        const users = await listUsers(env.apitest_bind);
        return json({ ok: true, data: users });
      }

      if (url.pathname === "/api/admin/update-status") {
        if (request.method !== "POST") return methodNotAllowed();
        const { userId, status } = await parseJsonSafe(request);
        const result = await import("./services/user-service.js").then(m => m.setUserStatus(env.apitest_bind, userId, status));
        return json(result);
      }

      if (url.pathname === "/api/admin/delete-user") {
        if (request.method !== "POST") return methodNotAllowed();
        const { userId } = await parseJsonSafe(request);
        const result = await import("./services/user-service.js").then(m => m.deleteUser(env.apitest_bind, userId));
        return json(result);
      }
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
