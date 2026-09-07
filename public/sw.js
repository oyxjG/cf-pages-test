/**
 * 数字花园 (Digital Garden) - Service Worker
 * 离线优先与多策略分层缓存引擎
 * 适配 Cloudflare Pages 干净 URL (Clean URLs) 与双轨自适应路由
 */

const CACHE_VERSION = 'digital-garden-v1.0.4';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// 核心预缓存资源列表（确保断网或无网络环境下所有工具与页面 100% 离线秒开）
const PRECACHE_ASSETS = [
  // 1. 核心底座与主页面
  '/',
  '/index.html',
  '/theme.css',
  '/index.css',
  '/theme.js',
  '/index.js',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
  '/tasks.html',
  '/tasks.js',
  '/story.html',
  '/login.html',
  '/register.html',

  // 2. 所有 17 个实用工具页面
  '/tool/holiday_tool.html',
  '/tool/timestamp_tool.html',
  '/tool/password_generator.html',
  '/tool/qrcode_tool.html',
  '/tool/base64_tool.html',
  '/tool/json_tool.html',
  '/tool/diff_tool.html',
  '/tool/markdown_tool.html',
  '/tool/regex_tool.html',
  '/tool/regex_generator_tool.html',
  '/tool/language_detector.html',
  '/tool/color_tool.html',
  '/tool/sm2_tool.html',
  '/tool/shelf_life_tool.html',
  '/tool/unit_converter.html',
  '/tool/opencv_beauty.html',
  '/tool/image_tool.html',

  // 3. 工具本地依赖库与脚本
  '/tool/franc.js',
  '/tool/sm2_lib.js',
  '/lib/sidebar_widgets.js',
  '/vendor/qrcode.min.js',
  '/vendor/jsQR.min.js',
  '/vendor/lunar.js',
  '/vendor/diff.min.js',
  '/vendor/marked.min.js',
  '/vendor/highlight.min.js',
  '/vendor/github.min.css',
  '/vendor/github-dark.min.css',
  '/vendor/katex.min.css',
  '/vendor/katex.min.js',
  '/vendor/mermaid.min.js',
  '/vendor/html2canvas.min.js',

  // 4. 高清矢量与位图应用图标
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable.png',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/icon-maskable.svg'
];

// 1. 安装阶段：预缓存全部核心资源与工具 (双轨键值写入：带 .html 与不带 .html 均写入缓存)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      // 并发预缓存所有资产
      await Promise.allSettled(
        PRECACHE_ASSETS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'no-cache' });
            if (res && res.ok) {
              // 1. 存入标准 key
              await cache.put(url, res.clone());

              // 2. 如果是 .html 页面，冗余写入无后缀的 Clean URL key（如 /tool/sm2_tool）
              // 彻底兼容 Cloudflare Pages 自动重定向机制
              if (url.endsWith('.html')) {
                const cleanKey = url.slice(0, -5);
                await cache.put(cleanKey, res.clone());
              }
            }
          } catch (err) {
            console.warn(`[SW] Precache failed for ${url}:`, err);
          }
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// 2. 激活阶段：清理旧版本缓存，立即接管所有客户端
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== STATIC_CACHE && name !== RUNTIME_CACHE) {
            console.log('[SW] 清理旧版缓存:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. 拦截请求：多策略分层路由
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 忽略非 GET 请求（POST/DELETE/PUT 交由网络或前端离线引擎处理）
  if (request.method !== 'GET') {
    return;
  }

  // 策略 A: API 请求 (/api/*) - 优先网络 (Network-First)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response && response.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, response.clone());
          }
          return response;
        } catch (err) {
          const cached = await caches.match(request);
          if (cached) return cached;

          return new Response(
            JSON.stringify({
              ok: false,
              offline: true,
              msg: '当前处于离线状态，操作已保存在本地，恢复联网后将自动同步。'
            }),
            {
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
              status: 200
            }
          );
        }
      })()
    );
    return;
  }

  // 策略 B: HTML 页面导航 (Navigation) - 优先网络，离线平滑双轨自适应匹配
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // 联网时优先网络加载，并在后台更新缓存
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
            // 冗余更新带/不带 .html 的对偶键
            if (url.pathname.endsWith('.html')) {
              cache.put(url.pathname.slice(0, -5), networkResponse.clone());
            } else if (!url.pathname.includes('.')) {
              cache.put(url.pathname + '.html', networkResponse.clone());
            }
          }
          return networkResponse;
        } catch (err) {
          // 彻底断网：进入强大的双轨自适应离线匹配
          const pathname = url.pathname;

          // (1) 原始请求匹配 (忽略 Query 参数)
          let cached = await caches.match(request, { ignoreSearch: true });
          if (cached) return cached;

          // (2) 路径精确匹配
          cached = await caches.match(pathname, { ignoreSearch: true });
          if (cached) return cached;

          // (3) 双向扩展名自适应补偿匹配 (完美解决 Clean URL / Canonicalization 问题)
          if (!pathname.endsWith('.html') && !pathname.includes('.')) {
            // 请求为 /tool/sm2_tool -> 尝试匹配 /tool/sm2_tool.html
            cached = await caches.match(pathname + '.html', { ignoreSearch: true });
            if (cached) return cached;
          } else if (pathname.endsWith('.html')) {
            // 请求为 /tool/sm2_tool.html -> 尝试匹配 /tool/sm2_tool
            cached = await caches.match(pathname.slice(0, -5), { ignoreSearch: true });
            if (cached) return cached;
          }

          // (4) 根路径回退首页
          if (pathname === '/' || pathname === '/index.html' || pathname === '') {
            cached = await caches.match('/index.html') || await caches.match('/');
            if (cached) return cached;
          }

          // (5) 兜底友好离线提示页（返回 HTTP 200，绝不让浏览器抛出 ERR_FAILED）
          return new Response(
            `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>离线提醒</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#faf6f0;color:#2d2d2d;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;box-sizing:border-box;text-align:center;} .box{background:#fff;border-radius:16px;padding:36px 28px;box-shadow:0 10px 30px rgba(0,0,0,0.06);max-width:420px;width:100%;} h2{color:#bf5b32;margin-top:0;} a{display:inline-block;margin-top:20px;padding:10px 22px;background:#bf5b32;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;}</style></head><body><div class="box"><h2>🌱 该页面暂未离线缓存</h2><p>当前处于无网络模式，该页面在断网前未完成预加载。请在恢复网络后刷新一次即可永久离线使用。</p><a href="/">返回数字花园首页</a></div></body></html>`,
            {
              status: 200,
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            }
          );
        }
      })()
    );
    return;
  }

  // 策略 C: 静态资产 (CSS / JS / 图片 / 字体 / 音频) - 缓存优先 + 后台更新 (Stale-While-Revalidate)
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
      // 后台异步向网络发起请求更新缓存 (Revalidate)
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          // 允许缓存正常 200 响应以及跨域 opaque 响应
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const clone = networkResponse.clone();
            const targetCache = url.origin === self.location.origin ? STATIC_CACHE : RUNTIME_CACHE;
            caches.open(targetCache).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // 离线静默失败，使用已有的缓存
        });

      // 命中缓存立即返回（毫秒级秒开），同时触发后台拉取更新
      return cachedResponse || fetchPromise;
    })
  );
});
