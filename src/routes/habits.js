import { json, parseJsonSafe } from "../utils/response.js";

const DEFAULT_HABITS = [
  { id: "water", name: "喝足八杯水 (2000ml)", icon: "💧", sort_order: 1 },
  { id: "exercise", name: "运动健身 30 分钟", icon: "🏃", sort_order: 2 },
  { id: "reading", name: "深度阅读一章节", icon: "📖", sort_order: 3 },
  { id: "early", name: "早起早睡有节律", icon: "🌙", sort_order: 4 },
  { id: "focus", name: "心流专注 2 小时", icon: "💻", sort_order: 5 }
];

/**
 * 确保习惯与打卡表在 D1 中存在
 */
async function ensureHabitTables(db) {
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS habits (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        icon TEXT DEFAULT '✨',
        frequency TEXT DEFAULT 'daily',
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS habit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        habit_id TEXT NOT NULL,
        check_date TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        UNIQUE(user_id, habit_id, check_date),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
      )
    `).run();

    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON habit_logs(user_id, check_date)
    `).run();
  } catch (e) {
    // 表已存在或索引已创建时忽略
  }
}

/**
 * 获取当前的本地日期字符串 YYYY-MM-DD（基于东八区/系统时间）
 */
function getLocalDateString(date = new Date()) {
  const d = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

/**
 * 计算两个 YYYY-MM-DD 日期的相隔天数
 */
function daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

/**
 * 计算某个习惯的当前连续打卡天数（Streak）
 */
function calculateStreak(dates, todayStr) {
  if (!dates || dates.length === 0) return 0;
  const sortedDates = [...new Set(dates)].sort().reverse();
  
  let streak = 0;
  const yesterdayDate = new Date(new Date(todayStr).getTime() - 86400000).toISOString().slice(0, 10);

  // 如果今天或昨天有打卡，则可以维持连击
  let expectedDate = sortedDates[0] === todayStr ? todayStr : (sortedDates[0] === yesterdayDate ? yesterdayDate : null);
  if (!expectedDate) return 0;

  for (const date of sortedDates) {
    if (date === expectedDate) {
      streak++;
      const prevDate = new Date(new Date(expectedDate).getTime() - 86400000).toISOString().slice(0, 10);
      expectedDate = prevDate;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * 计算全局历史最长连续打卡天数与当前连续打卡天数
 */
function calculateOverallStreaks(allDates, todayStr) {
  if (!allDates || allDates.length === 0) return { currentStreak: 0, maxStreak: 0 };
  const sortedDates = [...new Set(allDates)].sort();

  let maxStreak = 0;
  let tempStreak = 0;
  let prevDate = null;

  for (const date of sortedDates) {
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diff = daysBetween(prevDate, date);
      if (diff === 1) {
        tempStreak++;
      } else if (diff > 1) {
        tempStreak = 1;
      }
    }
    if (tempStreak > maxStreak) maxStreak = tempStreak;
    prevDate = date;
  }

  // 当前连击
  const currentStreak = calculateStreak(sortedDates, todayStr);
  return { currentStreak, maxStreak };
}

/**
 * 注册习惯打卡与热力图相关路由
 * @param {import('../utils/router.js').Router} router 
 */
export function registerHabitRoutes(router) {

  // 1. 获取习惯列表及今日完成状态
  router.get("/api/habits", async ({ env, user }) => {
    const db = env.apitest_bind;
    if (!db) return json({ ok: false, msg: "D1 database not configured" }, 500);

    const userId = user.userId;
    const todayStr = getLocalDateString();

    try {
      await ensureHabitTables(db);

      // 查询该用户是否有自定义习惯项
      let { results: habits } = await db.prepare(
        "SELECT id, name, icon, frequency, sort_order AS sortOrder FROM habits WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC"
      ).bind(userId).all();

      // 如果用户尚无任何习惯，自动为其初始化预设的 5 大习惯
      if (!habits || habits.length === 0) {
        const statements = DEFAULT_HABITS.map(h => 
          db.prepare(
            "INSERT INTO habits (id, user_id, name, icon, sort_order) VALUES (?, ?, ?, ?, ?)"
          ).bind(h.id, userId, h.name, h.icon, h.sort_order)
        );
        await db.batch(statements);

        const res = await db.prepare(
          "SELECT id, name, icon, frequency, sort_order AS sortOrder FROM habits WHERE user_id = ? ORDER BY sort_order ASC"
        ).bind(userId).all();
        habits = res.results;
      }

      // 查询今天已打卡的习惯 ID 列表
      const { results: todayLogs } = await db.prepare(
        "SELECT habit_id FROM habit_logs WHERE user_id = ? AND check_date = ?"
      ).bind(userId, todayStr).all();
      const todayDone = todayLogs.map(l => l.habit_id);

      // 查询各习惯最近打卡日期，计算各自 Streak
      const { results: recentLogs } = await db.prepare(
        "SELECT habit_id, check_date FROM habit_logs WHERE user_id = ? AND check_date >= date(?, '-90 days') ORDER BY check_date DESC"
      ).bind(userId, todayStr).all();

      const habitDatesMap = {};
      for (const log of recentLogs) {
        if (!habitDatesMap[log.habit_id]) habitDatesMap[log.habit_id] = [];
        habitDatesMap[log.habit_id].push(log.check_date);
      }

      const habitsWithStreak = habits.map(h => ({
        ...h,
        streak: calculateStreak(habitDatesMap[h.id] || [], todayStr)
      }));

      return json({
        ok: true,
        data: {
          todayDate: todayStr,
          habits: habitsWithStreak,
          todayDone
        }
      });
    } catch (err) {
      console.error("Fetch habits error:", err);
      return json({ ok: false, msg: err.message }, 500);
    }
  });

  // 2. 打卡或取消打卡 (Toggle Check-in)
  router.post("/api/habits/toggle", async ({ request, env, user }) => {
    const db = env.apitest_bind;
    if (!db) return json({ ok: false, msg: "D1 database not configured" }, 500);

    const userId = user.userId;
    const body = await parseJsonSafe(request);
    const habitId = body?.habitId;
    const checkDate = body?.date || getLocalDateString();

    if (!habitId) {
      return json({ ok: false, msg: "缺少 habitId 参数" }, 400);
    }

    try {
      await ensureHabitTables(db);

      // 检查今天是否已打卡
      const existing = await db.prepare(
        "SELECT id FROM habit_logs WHERE user_id = ? AND habit_id = ? AND check_date = ?"
      ).bind(userId, habitId, checkDate).first();

      let action = "";
      if (existing) {
        // 取消打卡
        await db.prepare(
          "DELETE FROM habit_logs WHERE id = ?"
        ).bind(existing.id).run();
        action = "uncheck";
      } else {
        // 进行打卡
        await db.prepare(
          "INSERT OR IGNORE INTO habit_logs (user_id, habit_id, check_date) VALUES (?, ?, ?)"
        ).bind(userId, habitId, checkDate).run();
        action = "check";
      }

      // 重新计算该习惯的最新的 streak
      const { results: logs } = await db.prepare(
        "SELECT check_date FROM habit_logs WHERE user_id = ? AND habit_id = ? ORDER BY check_date DESC LIMIT 90"
      ).bind(userId, habitId).all();
      const habitStreak = calculateStreak(logs.map(l => l.check_date), getLocalDateString());

      // 查询今天最新的所有打卡习惯 ID
      const { results: todayLogs } = await db.prepare(
        "SELECT habit_id FROM habit_logs WHERE user_id = ? AND check_date = ?"
      ).bind(userId, checkDate).all();

      return json({
        ok: true,
        data: {
          action,
          habitId,
          checkDate,
          habitStreak,
          todayDone: todayLogs.map(l => l.habit_id)
        }
      });
    } catch (err) {
      console.error("Toggle habit error:", err);
      return json({ ok: false, msg: err.message }, 500);
    }
  });

  // 3. 新增或更新自定义习惯项
  router.post("/api/habits", async ({ request, env, user }) => {
    const db = env.apitest_bind;
    if (!db) return json({ ok: false, msg: "D1 database not configured" }, 500);

    const userId = user.userId;
    const body = await parseJsonSafe(request);
    const { id, name, icon = "✨", sortOrder = 0 } = body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return json({ ok: false, msg: "习惯名称不能为空" }, 400);
    }

    const cleanName = name.trim().slice(0, 50);
    const cleanIcon = (icon || "✨").slice(0, 10);
    const habitId = id || `habit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    try {
      await ensureHabitTables(db);

      await db.prepare(`
        INSERT INTO habits (id, user_id, name, icon, sort_order) 
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET 
          name = excluded.name, 
          icon = excluded.icon, 
          sort_order = excluded.sort_order
      `).bind(habitId, userId, cleanName, cleanIcon, sortOrder).run();

      return json({
        ok: true,
        data: {
          id: habitId,
          name: cleanName,
          icon: cleanIcon,
          sortOrder
        },
        msg: id ? "修改习惯成功" : "添加习惯成功"
      });
    } catch (err) {
      return json({ ok: false, msg: err.message }, 500);
    }
  });

  // 4. 删除指定习惯项
  router.delete("/api/habits", async ({ request, env, user, url }) => {
    const db = env.apitest_bind;
    if (!db) return json({ ok: false, msg: "D1 database not configured" }, 500);

    const userId = user.userId;
    let habitId = url.searchParams.get("id");
    if (!habitId) {
      const body = await parseJsonSafe(request);
      habitId = body?.id;
    }

    if (!habitId) {
      return json({ ok: false, msg: "缺少习惯 ID" }, 400);
    }

    try {
      await ensureHabitTables(db);
      // 先删明细，再删习惯本身
      await db.batch([
        db.prepare("DELETE FROM habit_logs WHERE user_id = ? AND habit_id = ?").bind(userId, habitId),
        db.prepare("DELETE FROM habits WHERE user_id = ? AND id = ?").bind(userId, habitId)
      ]);

      return json({ ok: true, msg: "习惯已删除" });
    } catch (err) {
      return json({ ok: false, msg: err.message }, 500);
    }
  });

  // 5. 获取打卡贡献热力图数据 (Heatmap)
  router.get("/api/habits/heatmap", async ({ env, user, url }) => {
    const db = env.apitest_bind;
    if (!db) return json({ ok: false, msg: "D1 database not configured" }, 500);

    const userId = user.userId;
    const days = parseInt(url.searchParams.get("days") || "180", 10);
    const todayStr = getLocalDateString();

    try {
      await ensureHabitTables(db);

      // 查询总习惯数量
      const habitCountRes = await db.prepare(
        "SELECT COUNT(*) as total FROM habits WHERE user_id = ?"
      ).bind(userId).first();
      const totalHabits = Math.max(habitCountRes?.total || 5, 1);

      // 查询指定天数以内的打卡明细汇总
      const { results: logs } = await db.prepare(`
        SELECT check_date, COUNT(DISTINCT habit_id) as count 
        FROM habit_logs 
        WHERE user_id = ? AND check_date >= date(?, '-' || ? || ' days')
        GROUP BY check_date 
        ORDER BY check_date ASC
      `).bind(userId, todayStr, days).all();

      // 查询该用户全部日期的打卡记录，用于计算全局总打卡数与连击
      const { results: allLogs } = await db.prepare(
        "SELECT DISTINCT check_date FROM habit_logs WHERE user_id = ? ORDER BY check_date ASC"
      ).bind(userId).all();

      const allDates = allLogs.map(l => l.check_date);
      const { currentStreak, maxStreak } = calculateOverallStreaks(allDates, todayStr);

      // 计算每日热力图色阶等级 (0-4)
      const heatmap = {};
      let totalCheckIns = 0;

      for (const log of logs) {
        const count = log.count;
        totalCheckIns += count;
        const ratio = count / totalHabits;
        let level = 1;
        if (ratio >= 0.8) level = 4;
        else if (ratio >= 0.5) level = 3;
        else if (ratio >= 0.25) level = 2;
        else level = 1;

        heatmap[log.check_date] = {
          count,
          level
        };
      }

      return json({
        ok: true,
        data: {
          heatmap,
          totalHabits,
          stats: {
            totalCheckIns,
            activeDays: allDates.length,
            currentStreak,
            maxStreak
          }
        }
      });
    } catch (err) {
      console.error("Heatmap error:", err);
      return json({ ok: false, msg: err.message }, 500);
    }
  });

  // 6. 离线数据同步迁移到云端
  router.post("/api/habits/sync", async ({ request, env, user }) => {
    const db = env.apitest_bind;
    if (!db) return json({ ok: false, msg: "D1 database not configured" }, 500);

    const userId = user.userId;
    const body = await parseJsonSafe(request);
    const { habits, checkLogs } = body || {};

    try {
      await ensureHabitTables(db);
      const statements = [];

      // 导入自定义习惯
      if (Array.isArray(habits)) {
        for (const h of habits) {
          if (h.id && h.name) {
            statements.push(
              db.prepare(`
                INSERT INTO habits (id, user_id, name, icon, sort_order)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET name = excluded.name, icon = excluded.icon
              `).bind(h.id, userId, h.name, h.icon || "✨", h.sortOrder || 0)
            );
          }
        }
      }

      // 导入历史打卡记录: [{ habitId, date }]
      if (Array.isArray(checkLogs)) {
        for (const log of checkLogs) {
          if (log.habitId && log.date) {
            statements.push(
              db.prepare(
                "INSERT OR IGNORE INTO habit_logs (user_id, habit_id, check_date) VALUES (?, ?, ?)"
              ).bind(userId, log.habitId, log.date)
            );
          }
        }
      }

      if (statements.length > 0) {
        await db.batch(statements);
      }

      return json({ ok: true, msg: "打卡数据云端同步成功", count: statements.length });
    } catch (err) {
      return json({ ok: false, msg: err.message }, 500);
    }
  });
}
