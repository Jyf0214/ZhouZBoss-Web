/* eslint-disable no-console */
// Originium Kernel — 原生 Service Worker
// 缓存策略：静态资源 Cache-First / 页面导航 Network-First / 图片 Stale-While-Revalidate / API Network-Only

const CACHE_VERSION = 'originium-v1';
const OFFLINE_CACHE = 'originium-offline-v1';
const STATIC_CACHE = 'originium-static-v1';
const PAGE_CACHE = 'originium-pages-v1';
const IMAGE_CACHE = 'originium-images-v1';

// 安装时预缓存关键页面和离线页面
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => {
      return cache.addAll([
        '/offline.html',
        '/',
        '/posts',
        '/about',
      ]).catch((err) => {
        console.warn('[SW] 预缓存部分页面失败（首次安装可忽略）:', err);
      });
    })
  );
  // 立即激活，不等待旧 SW 卸载
  self.skipWaiting();
});

// 激活时清理旧版本缓存
self.addEventListener('activate', (event) => {
  const validCaches = new Set([CACHE_VERSION, OFFLINE_CACHE, STATIC_CACHE, PAGE_CACHE, IMAGE_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => !validCaches.has(key))
          .map((key) => {
            console.log('[SW] 清理旧缓存:', key);
            return caches.delete(key);
          })
      );
    }).then(() => {
      // 立即接管所有客户端
      return self.clients.claim();
    })
  );
});

// 判断是否为导航请求
function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

// 判断是否为静态资源（/_next/static/）
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/_next/static/');
}

// 判断是否为图片请求
function isImageRequest(request) {
  return request.destination === 'image';
}

// 判断是否为 API 请求
function isApiRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/');
}

// Cache-First：静态资源长期缓存
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 408, statusText: 'Request Timeout' });
  }
}

// Network-First：页面导航，离线回退缓存
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(PAGE_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // 回退到离线页面
    const offlinePage = await caches.match('/offline.html');
    return offlinePage || new Response('Offline', { status: 503 });
  }
}

// Stale-While-Revalidate：图片，先返回缓存同时后台更新
async function staleWhileRevalidate(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}

// 处理 SKIP_WAITING 消息：新 SW 就绪后立即接管
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 请求拦截与路由分发
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // API 请求：Network-Only，不缓存
  if (isApiRequest(request)) {
    return;
  }

  // 静态资源：Cache-First
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 图片：Stale-While-Revalidate
  if (isImageRequest(request)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 页面导航：Network-First
  if (isNavigationRequest(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 其他请求：Network-First
  event.respondWith(networkFirst(request));
});
