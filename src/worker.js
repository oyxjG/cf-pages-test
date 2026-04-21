import { createUser, listUsers, loginWithPassword } from "./services/user-service.js";
import { json, methodNotAllowed, notFound } from "./utils/response.js";

function parseJsonSafe(request) {
  return request.json().catch(() => null);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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

      const user = await loginWithPassword(env.apitest_bind, username, password);
      if (!user) {
        return json({ ok: false, msg: "用户名或密码错误" }, 401);
      }

      return json({ ok: true, msg: "登录成功", user });
    }

    if (url.pathname === "/api/users") {
      const users = await listUsers(env.apitest_bind);
      return json({ ok: true, data: users });
    }

    if (url.pathname === "/api/add-user") {
      if (request.method !== "POST") return methodNotAllowed();

      const body = await parseJsonSafe(request);
      const username = (body?.username || "").trim();
      const password = (body?.password || "").trim();

      if (!username || !password) {
        return json({ ok: false, msg: "参数错误：用户名和密码不能为空" }, 400);
      }

      const result = await createUser(env.apitest_bind, username, password);
      return json({ ok: result.ok, msg: result.msg }, result.status);
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
