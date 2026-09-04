import { json, parseJsonSafe } from "../utils/response.js";
import { getUserSummary, setUserStatus, deleteUser } from "../services/user-service.js";
import { requireAdmin } from "../middlewares/auth.js";

/**
 * 注册管理员控制台相关路由
 * @param {import('../utils/router.js').Router} router 
 */
export function registerAdminRoutes(router) {
  // 为所有 /api/admin/ 前缀接口应用管理员权限守卫中间件
  router.use("/api/admin", requireAdmin);

  // 获取后台全部故事列表
  router.get("/api/admin/stories", async ({ env }) => {
    const db = env.apitest_bind;
    if (!db) return json({ ok: false, msg: "D1 database not configured" }, 500);

    try {
      const { results } = await db.prepare(
        "SELECT id, title, author, created_at AS createdAt, status FROM stories ORDER BY created_at DESC"
      ).all();
      return json({ ok: true, data: results });
    } catch (err) {
      return json({ ok: false, msg: err.message }, 500);
    }
  });

  // 保存或更新故事
  router.post("/api/admin/stories/save", async ({ request, env }) => {
    const db = env.apitest_bind;
    if (!db) return json({ ok: false, msg: "D1 database not configured" }, 500);

    const body = await parseJsonSafe(request);
    if (!body) return json({ ok: false, msg: "Invalid JSON body" }, 400);

    const { id, title, author, content, status } = body;
    if (!id || !title || !content) {
      return json({ ok: false, msg: "ID、标题和内容不能为空" }, 400);
    }

    const numericStatus = parseInt(status) === 1 ? 1 : 0;
    const now = Date.now();

    try {
      const existing = await db.prepare("SELECT created_at FROM stories WHERE id = ?").bind(id).first();
      if (existing) {
        let createdAt = existing.created_at || now;
        if (numericStatus === 1) {
          createdAt = now;
        }
        await db.prepare(
          "UPDATE stories SET title = ?, author = ?, content = ?, status = ?, created_at = ? WHERE id = ?"
        ).bind(title, author || "管理员", content, numericStatus, createdAt, id).run();
        return json({ ok: true, msg: "更新故事成功" });
      } else {
        const createdAt = now;
        await db.prepare(
          "INSERT INTO stories (id, title, author, content, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(id, title, author || "管理员", content, numericStatus, createdAt).run();
        return json({ ok: true, msg: "保存故事成功" });
      }
    } catch (err) {
      return json({ ok: false, msg: err.message }, 500);
    }
  });

  // 快速更新故事发布状态
  router.post("/api/admin/stories/update-status", async ({ request, env }) => {
    const db = env.apitest_bind;
    if (!db) return json({ ok: false, msg: "D1 database not configured" }, 500);

    const body = await parseJsonSafe(request);
    if (!body) return json({ ok: false, msg: "Invalid JSON body" }, 400);

    const { id, status } = body;
    if (!id) return json({ ok: false, msg: "Missing story ID" }, 400);

    const numericStatus = parseInt(status) === 1 ? 1 : 0;
    const now = Date.now();

    try {
      await db.prepare(
        "UPDATE stories SET status = ?, created_at = ? WHERE id = ?"
      ).bind(numericStatus, now, id).run();
      return json({ ok: true, msg: "更新状态成功" });
    } catch (err) {
      return json({ ok: false, msg: err.message }, 500);
    }
  });

  // 彻底删除故事
  router.post("/api/admin/stories/delete", async ({ request, env }) => {
    const db = env.apitest_bind;
    if (!db) return json({ ok: false, msg: "D1 database not configured" }, 500);

    const body = await parseJsonSafe(request);
    if (!body) return json({ ok: false, msg: "Invalid JSON body" }, 400);

    const { id } = body;
    if (!id) return json({ ok: false, msg: "Missing story ID" }, 400);

    try {
      await db.prepare("DELETE FROM stories WHERE id = ?").bind(id).run();
      return json({ ok: true, msg: "彻底删除成功" });
    } catch (err) {
      return json({ ok: false, msg: err.message }, 500);
    }
  });

  // 用户统计与列表获取
  router.get("/api/admin/users", async ({ env }) => {
    const { users, stats } = await getUserSummary(env.apitest_bind);
    return json({ ok: true, data: users, stats });
  });

  // 修改用户停用/启用状态并清理 token
  router.post("/api/admin/update-status", async ({ request, env }) => {
    const { userId, status } = (await parseJsonSafe(request)) || {};
    const result = await setUserStatus(env.apitest_bind, userId, status);

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
  });

  // 逻辑删除用户并清理 token
  router.post("/api/admin/delete-user", async ({ request, env }) => {
    const { userId } = (await parseJsonSafe(request)) || {};
    const result = await deleteUser(env.apitest_bind, userId);

    const kv = env.CF_TEST;
    if (kv) {
      const prefix = `login_tokens:${userId}:`;
      const list = await kv.list({ prefix });
      for (const key of list.keys) {
        await kv.delete(key.name);
      }
    }
    return json(result);
  });
}
