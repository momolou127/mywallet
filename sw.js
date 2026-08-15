// 存款记 - Service Worker（PWA 离线可用）
// 策略：stale-while-revalidate（先返回缓存保流畅，后台异步拉新版覆盖）
// 缓存版本：v16（每次发布新功能时 bump 一次，避免被旧缓存卡住）
const CACHE_NAME = 'deposit-tracker-v16';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// 安装：预缓存 app shell，并强制让新 SW 立刻接管页面
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// 激活：清理所有旧缓存，并接管所有未受控页面
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 请求：stale-while-revalidate —— 命中缓存立刻返回（保证秒开），同时后台异步拉新版更新缓存
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached);
      // 有缓存就先返回缓存（秒开），同时后台拉新版；无缓存就等网络
      return cached || networkFetch;
    })
  );
});