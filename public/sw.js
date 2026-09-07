/**
 * 数字花园 (Digital Garden) - Service Worker
 * 离线优先与多策略分层缓存引擎
 */

const CACHE_VERSION = 'digital-garden-v1.0.3';
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

// 1. 安装阶段：预缓存全部核心资源与工具
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // 容错预缓存，确保所有资源批量预取
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) => 
          fetch(url, { cache: 'no-cache' })
            .then((res) => {
              if (res.ok) return cache.put(url, res);
            })
            .catch((err) => {
              console.warn(`[SW] Precache failed for ${url}:`, err);
            })
        )
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
      fetch(request)
        .then((response) => {
          // 只读 GET 接口成功后在运行时缓存备份一份
          if (response.ok && request.method === 'GET') {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // 断网时尝试从运行时缓存返回旧数据
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          // 彻底断网且无缓存时返回友好 JSON 响应
          return new Response(
            JSON.stringify({
              ok: false,
              offline: true,
              msg: '当前处于离线状态，操作已保存在本地，稍后恢复联网后自动同步。'
            }),
            {
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
              status: 200
            }
          );
        })
    );
    return;
  }

  // 策略 B: HTML 页面导航 (Navigation) - 优先网络，离线平滑回退到缓存
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // 1. 精确匹配当前导航 URL（已预缓存所有工具页面）
          const cached = await caches.match(request);
          if (cached) return cached;

          // 2. 如果请求带参数或哈希，尝试按 pathname 再次匹配
          const pathCached = await caches.match(url.pathname);
          if (pathCached) return pathCached;

          // 3. 仅对根路径或无后缀主站路径回退到首页
          if (url.pathname === '/' || !url.pathname.includes('.')) {
            const indexFallback = await caches.match('/index.html');
            if (indexFallback) return indexFallback;
          }

          // 4. 离线专属温馨提示（避免张冠李戴返回首页破坏单页工具）
          return new Response(
            `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>离线提醒</title><style>body{font-family:-apple-system,sans-serif;text-align:center;padding:60px 20px;background:#faf6f0;color:#2c2c2c;}h2{color:#bf5b32;}a{display:inline-block;margin-top:20px;color:#bf5b32;font-weight:bold;text-decoration:none;}</style></head><body><h2>🌱 该页面暂未完成离线缓存</h2><p>请在恢复联网后访问一次，系统将自动离线缓存。</p><a href="/">返回首页</a></body></html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 }
          );
        })
    );
    return;
  }

  // 策略 C: 静态资产 (CSS / JS / 图片 / 字体 / 音频) - 缓存优先 + 后台更新 (Stale-While-Revalidate)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
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
