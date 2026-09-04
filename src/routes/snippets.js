import { json, parseJsonSafe } from "../utils/response.js";

/**
 * 注册代码片段与便签归档相关路由
 * @param {import('../utils/router.js').Router} router 
 */
export function registerSnippetRoutes(router) {
  // 获取当前用户的便签/代码片段列表
  router.get("/api/snippets", async ({ env, user }) => {
    const db = env.apitest_bind;
    if (!db) return json({ ok: false, msg: "D1 database not configured" }, 500);

    const userId = user.userId;

    try {
      const { results } = await db.prepare(
        "SELECT id, title, content, lang, created_at AS createdAt, updated_at AS updatedAt FROM snippets WHERE user_id = ? ORDER BY id DESC"
      ).bind(userId).all();

      return json({ ok: true, data: results });
    } catch (err) {
      return json({ ok: false, msg: err.message }, 500);
    }
  });

  // 创建或更新便签/代码片段
  router.post("/api/snippets", async ({ request, env, user }) => {
    const db = env.apitest_bind;
    if (!db) return json({ ok: false, msg: "D1 database not configured" }, 500);

    const userId = user.userId;
    const body = await parseJsonSafe(request);
    if (!body?.title || !body?.content) {
      return json({ ok: false, msg: "标题和内容不能为空" }, 400);
    }

    const { id, title, content, lang = "plaintext" } = body;

    try {
      if (id) {
        await db.prepare(
          "UPDATE snippets SET title = ?, content = ?, lang = ?, updated_at = datetime('now', 'localtime') WHERE id = ? AND user_id = ?"
        ).bind(title, content, lang, id, userId).run();
        return json({ ok: true, msg: "更新成功" });
      } else {
        const res = await db.prepare(
          "INSERT INTO snippets (user_id, title, content, lang) VALUES (?, ?, ?, ?)"
        ).bind(userId, title, content, lang).run();
        return json({ ok: true, msg: "创建成功", id: res.meta?.last_row_id });
      }
    } catch (err) {
      return json({ ok: false, msg: err.message }, 500);
    }
  });

  // 删除便签/代码片段
  router.delete("/api/snippets", async ({ env, user, url }) => {
    const db = env.apitest_bind;
    if (!db) return json({ ok: false, msg: "D1 database not configured" }, 500);

    const userId = user.userId;
    const id = url.searchParams.get("id");
    if (!id) return json({ ok: false, msg: "缺少 ID" }, 400);

    try {
      await db.prepare("DELETE FROM snippets WHERE id = ? AND user_id = ?").bind(id, userId).run();
      return json({ ok: true, msg: "删除成功" });
    } catch (err) {
      return json({ ok: false, msg: err.message }, 500);
    }
  });
}
