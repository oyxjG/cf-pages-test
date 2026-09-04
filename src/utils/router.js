import { methodNotAllowed } from "./response.js";

/**
 * 零外部依赖的轻量级原生 Edge 路由器
 */
export class Router {
  constructor() {
    this.routes = [];
    this.middlewares = [];
  }

  /**
   * 注册中间件
   * @param {string|Function} prefixOrHandler 路径前缀或处理函数
   * @param {...Function} handlers 处理函数
   */
  use(prefixOrHandler, ...handlers) {
    if (typeof prefixOrHandler === "string") {
      for (const h of handlers) {
        this.middlewares.push({ prefix: prefixOrHandler, handler: h });
      }
    } else if (typeof prefixOrHandler === "function") {
      this.middlewares.push({ prefix: null, handler: prefixOrHandler });
      for (const h of handlers) {
        this.middlewares.push({ prefix: null, handler: h });
      }
    }
    return this;
  }

  add(method, path, ...handlers) {
    this.routes.push({
      method: method.toUpperCase(),
      path,
      handlers
    });
    return this;
  }

  get(path, ...handlers) { return this.add("GET", path, ...handlers); }
  post(path, ...handlers) { return this.add("POST", path, ...handlers); }
  delete(path, ...handlers) { return this.add("DELETE", path, ...handlers); }
  put(path, ...handlers) { return this.add("PUT", path, ...handlers); }

  /**
   * 处理 HTTP 请求
   * @param {Request} request 
   * @param {object} env 
   * @param {object} ctx 
   * @returns {Promise<Response|null>}
   */
  async handle(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();

    // 1. 查找匹配的路由
    const matchedRoute = this.routes.find(
      r => r.path === pathname && (r.method === method || r.method === "ALL")
    );

    let methodMismatch = false;
    if (!matchedRoute) {
      // 检查是否仅 Method 不匹配
      methodMismatch = this.routes.some(r => r.path === pathname);
      if (methodMismatch) {
        return methodNotAllowed();
      }
      return null;
    }

    // 2. 构造请求上下文
    const context = {
      request,
      env,
      ctx,
      url,
      pathname,
      user: null
    };

    // 3. 收集适用的中间件
    const applicableMiddlewares = this.middlewares
      .filter(m => !m.prefix || pathname.startsWith(m.prefix))
      .map(m => m.handler);

    const pipeline = [...applicableMiddlewares, ...matchedRoute.handlers];

    // 4. 流水线执行
    for (const handler of pipeline) {
      const result = await handler(context);
      if (result instanceof Response) {
        return result;
      }
    }

    return null;
  }
}
