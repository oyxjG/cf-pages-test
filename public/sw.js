/**
 * 数字花园 (Digital Garden) - Service Worker
 * 离线优先与多策略分层缓存引擎
 */

const CACHE_VERSION = 'digital-garden-v1.0.2';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// 核心预缓存资源列表（确保断网或无网络环境下秒开）
const PRECACHE_ASSETS = [
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
  '/tool/markdown_tool.html',
  '/tool/diff_tool.html',
  '/tool/json_tool.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable.png',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/icon-maskable.svg'
];

// 1. 安装阶段：预缓存基础核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // 容错预缓存，避免个别文件失败导致整体挂起
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

// 2. 激活阶段：清理旧版本缓存，立即接管客户端
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

  // 策略 B: HTML 页面导航 (Navigation) - 优先网络，离线回退到缓存
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
          const cached = await caches.match(request);
          if (cached) return cached;
          const indexFallback = await caches.match('/index.html');
          if (indexFallback) return indexFallback;
          return new Response('离线状态，页面未缓存', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  // 策略 C: 静态资产 (CSS / JS / 图片 / 字体) - Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // 后台异步向网络发起请求更新缓存 (Revalidate)
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
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
