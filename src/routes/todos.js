import { json, parseJsonSafe } from "../utils/response.js";

/**
 * 注册云端待办事项相关路由
 * @param {import('../utils/router.js').Router} router 
 */
export function registerTodoRoutes(router) {
  // 获取当前用户的待办列表
  router.get("/api/todos", async ({ env, user }) => {
    const db = env.apitest_bind;
    if (!db) return json({ ok: false, msg: "D1 database not configured" }, 500);

    const userId = user.userId;

    try {
      const { results } = await db.prepare(
        "SELECT text, completed, created_at AS createdAt, completed_at AS completedAt FROM todos WHERE user_id = ? ORDER BY id DESC"
      ).bind(userId).all();

      return json({
        ok: true,
        data: results.map(r => {
          const cAt = typeof r.createdAt === "string" ? new Date(r.createdAt).getTime() : r.createdAt;
          const compAt = typeof r.completedAt === "string" ? new Date(r.completedAt).getTime() : r.completedAt;
          return {
            text: r.text,
            completed: !!r.completed,
            createdAt: cAt,
            completedAt: compAt
          };
        })
      });
    } catch (err) {
      return json({ ok: false, msg: err.message }, 500);
    }
  });

  // 批量同步待办列表
  router.post("/api/todos", async ({ request, env, user }) => {
    const db = env.apitest_bind;
    if (!db) return json({ ok: false, msg: "D1 database not configured" }, 500);

    const userId = user.userId;
    const body = await parseJsonSafe(request);
    const todos = body?.todos;

    if (!Array.isArray(todos)) {
      return json({ ok: false, msg: "Invalid todos data" }, 400);
    }

    try {
      const statements = [
        db.prepare("DELETE FROM todos WHERE user_id = ?").bind(userId)
      ];

      for (const todo of todos) {
        const cAtStr = todo.createdAt ? new Date(todo.createdAt).toISOString() : new Date().toISOString();
        const compAtStr = todo.completedAt ? new Date(todo.completedAt).toISOString() : null;

        statements.push(
          db.prepare(
            "INSERT INTO todos (user_id, text, completed, created_at, completed_at) VALUES (?, ?, ?, ?, ?)"
          ).bind(userId, todo.text, todo.completed ? 1 : 0, cAtStr, compAtStr)
        );
      }

      await db.batch(statements);
      return json({ ok: true, msg: "同步成功" });
    } catch (err) {
      console.error("D1 Sync Error:", err.message);
      return json({ ok: false, msg: "数据库同步失败: " + err.message }, 500);
    }
  });
}
