import { verify } from "../utils/jwt.js";
import { json } from "../utils/response.js";

export const JWT_SECRET = "your-secret-key-at-least-32-chars";

// 公开无需强制登录的接口路径
export const PUBLIC_PATHS = [
  "/",
  "/api/login",
  "/api/register",
  "/api/test",
  "/api/stories",
  "/api/stories/detail"
];

/**
 * 校验并获取当前已登录用户信息
 * @param {Request} request 
 * @param {object} env 
 * @returns {Promise<object|null>}
 */
export async function getAuthUser(request, env) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];
  const payload = await verify(token, env.JWT_SECRET || JWT_SECRET);
  if (!payload || !payload.userId || !payload.uuid) return null;

  // 检查 KV 中是否存在该 token（是否已被主动下线或被踢出）
  const kv = env.CF_TEST;
  if (kv) {
    const kvToken = await kv.get(`login_tokens:${payload.userId}:${payload.uuid}`);
    if (!kvToken) return null;
  }

  return payload;
}

/**
 * 统一 API 鉴权拦截中间件
 * @param {object} context 
 */
export async function authMiddleware(context) {
  const { request, env, pathname } = context;
  const isPublic = PUBLIC_PATHS.includes(pathname);

  const authUser = await getAuthUser(request, env);
  if (authUser) {
    context.user = authUser;
  }

  if (!isPublic && !authUser) {
    return json({ ok: false, msg: "请先登录" }, 401);
  }
}

/**
 * 管理员特权校验中间件
 * @param {object} context 
 */
export async function requireAdmin(context) {
  if (!context.user || context.user.role !== "admin") {
    return json({ ok: false, msg: "无权访问管理接口" }, 403);
  }
}
