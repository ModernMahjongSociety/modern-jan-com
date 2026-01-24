// Service Worker for モダンジャン研究会
// Cloudflare Workers と混同しないこと: これはブラウザ側のService Worker

const CACHE_VERSION = 'modern-jan-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// キャッシュするリソース
const STATIC_ASSETS = [
  '/',
  '/blog/',
  '/about/',
  '/member/',
  '/tutorial/',
  '/offline.html', // オフラインページ（作成予定）
];

// インストール時のキャッシュ
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS.filter(url => url !== '/offline.html')); // offline.htmlは後で追加
    }).catch((error) => {
      console.error('[SW] Failed to cache static assets:', error);
    })
  );

  // 即座に有効化
  self.skipWaiting();
});

// アクティベーション時の古いキャッシュ削除
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            // 現在のバージョンのキャッシュ以外を削除
            return cacheName.startsWith('modern-jan-') &&
                   cacheName !== STATIC_CACHE &&
                   cacheName !== DYNAMIC_CACHE &&
                   cacheName !== IMAGE_CACHE;
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );

  // すぐにクライアントを制御
  return self.clients.claim();
});

// 許可するオリジンのホワイトリスト
const ALLOWED_ORIGINS = [
  self.location.origin,
  'https://r2.modern-jan.com',
];

// フェッチイベント: キャッシュ戦略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ホワイトリストにあるオリジンのみ処理（サードパーティを完全にブロック）
  if (!ALLOWED_ORIGINS.includes(url.origin)) {
    return;
  }

  // クレデンシャル（Cookie）を含むリクエストはキャッシュしない
  if (request.credentials === 'include') {
    return;
  }

  // 画像のキャッシュ戦略（Cache First）
  if (request.destination === 'image' || url.origin === 'https://r2.modern-jan.com') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request, { credentials: 'omit' }).then((response) => {
          // 成功したレスポンス、かつCookieを含まないもののみキャッシュ
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Set-Cookieヘッダーがある場合はキャッシュしない
          if (response.headers.has('Set-Cookie')) {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(IMAGE_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        });
      })
    );
    return;
  }

  // CSS/JSのキャッシュ戦略（Cache First）
  if (request.destination === 'style' ||
      request.destination === 'script' ||
      url.pathname.startsWith('/_astro/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request, { credentials: 'omit' }).then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }

          // Set-Cookieヘッダーがある場合はキャッシュしない
          if (response.headers.has('Set-Cookie')) {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        });
      })
    );
    return;
  }

  // HTMLページのキャッシュ戦略（Network First）
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request, { credentials: 'same-origin' })
        .then((response) => {
          // 正常なレスポンスのみキャッシュ
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // ネットワークが利用できない場合、キャッシュから返す
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // キャッシュもない場合、オフラインページを返す
            return caches.match('/offline.html');
          });
        })
    );
    return;
  }
});
