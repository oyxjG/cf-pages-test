import { json, parseJsonSafe } from "../utils/response.js";

/**
 * 注册用户偏好设置（工具收藏、最近使用、书签、便签等）相关路由
 * @param {import('../utils/router.js').Router} router 
 */
export function registerPreferenceRoutes(router) {
  // 获取当前用户偏好设置
  router.get("/api/user/preferences", async ({ env, user }) => {
    const db = env.apitest_bind;
    if (!db) return json({ ok: false, msg: "D1 database not configured" }, 500);

    const userId = user.userId;

    try {
      const row = await db.prepare(
        "SELECT favorites, recent_tools, custom_settings FROM user_preferences WHERE user_id = ?"
      ).bind(userId).first();

      if (!row) {
        return json({
          ok: true,
          data: { favorites: [], recentTools: [], customSettings: {} }
        });
      }

      return json({
        ok: true,
        data: {
          favorites: JSON.parse(row.favorites || "[]"),
          recentTools: JSON.parse(row.recent_tools || "[]"),
          customSettings: JSON.parse(row.custom_settings || "{}")
        }
      });
    } catch (err) {
      return json({ ok: false, msg: err.message }, 500);
    }
  });

  // 保存/增量更新当前用户偏好设置
  router.post("/api/user/preferences", async ({ request, env, user }) => {
    const db = env.apitest_bind;
    if (!db) return json({ ok: false, msg: "D1 database not configured" }, 500);

    const userId = user.userId;
    const body = await parseJsonSafe(request);
    if (!body) return json({ ok: false, msg: "Invalid JSON body" }, 400);

    try {
      // 先查询已有配置以支持增量合并
      const existingRow = await db.prepare(
        "SELECT favorites, recent_tools, custom_settings FROM user_preferences WHERE user_id = ?"
      ).bind(userId).first();

      let favorites = existingRow?.favorites ? JSON.parse(existingRow.favorites) : [];
      let recentTools = existingRow?.recent_tools ? JSON.parse(existingRow.recent_tools) : [];
      let customSettings = existingRow?.custom_settings ? JSON.parse(existingRow.custom_settings) : {};

      if (Array.isArray(body.favorites)) {
        favorites = body.favorites;
      }
      if (Array.isArray(body.recentTools)) {
        recentTools = body.recentTools;
      }
      if (typeof body.customSettings === "object" && body.customSettings !== null) {
        customSettings = { ...customSettings, ...body.customSettings };
      }

      const favoritesStr = JSON.stringify(favorites);
      const recentStr = JSON.stringify(recentTools);
      const settingsStr = JSON.stringify(customSettings);

      await db.prepare(`
        INSERT INTO user_preferences (user_id, favorites, recent_tools, custom_settings, updated_at)
        VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
        ON CONFLICT(user_id) DO UPDATE SET
          favorites = excluded.favorites,
          recent_tools = excluded.recent_tools,
          custom_settings = excluded.custom_settings,
          updated_at = datetime('now', 'localtime')
      `).bind(userId, favoritesStr, recentStr, settingsStr).run();

      return json({
        ok: true,
        msg: "偏好设置保存成功",
        data: { favorites, recentTools, customSettings }
      });
    } catch (err) {
      return json({ ok: false, msg: err.message }, 500);
    }
  });
}
