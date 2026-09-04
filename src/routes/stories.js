import { json } from "../utils/response.js";
import { getAuthUser } from "../middlewares/auth.js";

/**
 * 注册前台故事花园流相关路由
 * @param {import('../utils/router.js').Router} router 
 */
export function registerStoryRoutes(router) {
  // 获取公开故事列表
  router.get("/api/stories", async ({ env }) => {
    const db = env.apitest_bind;
    if (!db) return json({ ok: false, msg: "D1 database not configured" }, 500);

    try {
      const { results } = await db.prepare(
        "SELECT id, title, author, created_at AS createdAt, status FROM stories WHERE status = 1 ORDER BY created_at DESC"
      ).all();

      return json({
        ok: true,
        data: results
      });
    } catch (err) {
      return json({ ok: false, msg: err.message }, 500);
    }
  });

  // 获取单个故事详情（包含草稿权限校验）
  router.get("/api/stories/detail", async ({ request, env, url }) => {
    const db = env.apitest_bind;
    if (!db) return json({ ok: false, msg: "D1 database not configured" }, 500);

    const id = url.searchParams.get("id");
    if (!id) return json({ ok: false, msg: "Missing story ID" }, 400);

    try {
      const story = await db.prepare(
        "SELECT id, title, author, content, status, created_at AS createdAt FROM stories WHERE id = ?"
      ).bind(id).first();

      if (!story) {
        return json({ ok: false, msg: "故事不存在" }, 404);
      }

      if (story.status === 0) {
        // 草稿箱，只有管理员才能访问
        const authUser = await getAuthUser(request, env);
        if (!authUser || authUser.role !== "admin") {
          return json({ ok: false, msg: "无权查看草稿" }, 403);
        }
      }

      return json({
        ok: true,
        data: {
          id: story.id,
          title: story.title,
          author: story.author,
          content: story.content,
          status: story.status,
          createdAt: story.createdAt
        }
      });
    } catch (err) {
      return json({ ok: false, msg: err.message }, 500);
    }
  });
}
