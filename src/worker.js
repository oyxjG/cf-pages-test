import { Router } from "./utils/router.js";
import { authMiddleware } from "./middlewares/auth.js";
import { notFound } from "./utils/response.js";

import { registerAuthRoutes } from "./routes/auth.js";
import { registerStoryRoutes } from "./routes/stories.js";
import { registerTodoRoutes } from "./routes/todos.js";
import { registerPreferenceRoutes } from "./routes/preferences.js";
import { registerSnippetRoutes } from "./routes/snippets.js";
import { registerAdminRoutes } from "./routes/admin.js";

// 1. 初始化路由器
const router = new Router();

// 2. 注册通用 API 鉴权拦截中间件
router.use("/api/", authMiddleware);

// 3. 注册各业务领域子路由
registerAuthRoutes(router);
registerStoryRoutes(router);
registerTodoRoutes(router);
registerPreferenceRoutes(router);
registerSnippetRoutes(router);
registerAdminRoutes(router);

// 4. Cloudflare Worker 主入口
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. 域名特定根路径映射
    if (pathname === "/" && url.hostname === "t.uu5c.top") {
      if (env.ASSETS) {
        const indexUrl = new URL("/index.html", request.url);
        return env.ASSETS.fetch(new Request(indexUrl, request));
      }
      return notFound();
    }

    // 2. API 路由处理
    if (pathname.startsWith("/api/")) {
      const response = await router.handle(request, env, ctx);
      if (response) {
        return response;
      }
      return notFound();
    }

    // 3. 静态资源托管 (Cloudflare Assets)
    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    }

    return notFound();
  }
};
