/**
 * IconForge PWA Service Worker
 * Handles caching, offline functionality, and background sync
 */

const CACHE_NAME = 'iconforge-v1.0.0';
const STATIC_CACHE = 'iconforge-static-v1';
const DYNAMIC_CACHE = 'iconforge-dynamic-v1';

// Files to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/manifest.json',
];

// Runtime caching patterns
const RUNTIME_CACHE_PATTERNS = [
  /^https:\/\/fonts\.googleapis\.com/,
  /^https:\/\/fonts\.gstatic\.com/,
  /^https:\/\/unpkg\.com/
];

/**
 * Service Worker installation
 */
self.addEventListener('install', event => {
  console.log('Service Worker: Installing');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
});

/**
 * Service Worker activation
 */
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              return cacheName !== STATIC_CACHE && 
                     cacheName !== DYNAMIC_CACHE &&
                     cacheName !== CACHE_NAME;
            })
            .map(cacheName => {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),

      // Take control of all clients
      self.clients.claim()
    ])
  );
});

/**
 * Fetch event handler with advanced caching strategies
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different types of requests
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isRuntimeCacheable(request)) {
    event.respondWith(handleRuntimeCache(request));
  } else {
    event.respondWith(handleNetworkFirst(request));
  }
});

/**
 * Check if request is for a static asset
 * @param {Request} request - Fetch request
 * @returns {boolean} - Is static asset
 */
function isStaticAsset(request) {
  const url = new URL(request.url);

  // Same origin static files
  if (url.origin === location.origin) {
    return url.pathname.match(/\.(css|js|html|json)$/);
  }

  // External static resources
  return STATIC_ASSETS.some(asset => request.url.includes(asset));
}

/**
 * Check if request should be runtime cached
 * @param {Request} request - Fetch request
 * @returns {boolean} - Should be cached
 */
function isRuntimeCacheable(request) {
  return RUNTIME_CACHE_PATTERNS.some(pattern => pattern.test(request.url));
}

/**
 * Handle static asset requests with cache-first strategy
 * @param {Request} request - Fetch request
 * @returns {Promise<Response>} - Response
 */
async function handleStaticAsset(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('Service Worker: Serving from cache', request.url);
      return cachedResponse;
    }

    // Fallback to network
    console.log('Service Worker: Fetching from network', request.url);
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;

  } catch (error) {
    console.error('Service Worker: Static asset fetch failed', error);

    // Return offline fallback for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return createOfflinePage();
    }

    throw error;
  }
}

/**
 * Handle runtime cacheable requests with stale-while-revalidate
 * @param {Request} request - Fetch request
 * @returns {Promise<Response>} - Response
 */
async function handleRuntimeCache(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);

  // Fetch from network and update cache
  const networkFetch = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(error => {
      console.warn('Service Worker: Network fetch failed', error);
      return cachedResponse;
    });

  // Return cached version immediately if available
  return cachedResponse || networkFetch;
}

/**
 * Handle network-first requests
 * @param {Request} request - Fetch request
 * @returns {Promise<Response>} - Response
 */
async function handleNetworkFirst(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    // Cache successful responses in dynamic cache
    if (networkResponse.ok && request.url.startsWith('http')) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;

  } catch (error) {
    console.warn('Service Worker: Network first failed, trying cache', error);

    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return createOfflinePage();
    }

    throw error;
  }
}

/**
 * Create offline fallback page
 * @returns {Response} - Offline page response
 */
function createOfflinePage() {
  const offlineHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>IconForge - Offline</title>
        <style>
            body {
                font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: #f9fafb;
                color: #374151;
                text-align: center;
                padding: 2rem;
            }

            .offline-icon {
                width: 64px;
                height: 64px;
                margin-bottom: 2rem;
                color: #6b7280;
            }

            .offline-title {
                font-size: 2rem;
                font-weight: 700;
                margin-bottom: 1rem;
                color: #1f2937;
            }

            .offline-message {
                font-size: 1.125rem;
                line-height: 1.75;
                margin-bottom: 2rem;
                max-width: 500px;
            }

            .retry-btn {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1.5rem;
                background: #4f46e5;
                color: white;
                border: none;
                border-radius: 0.5rem;
                font-size: 1rem;
                font-weight: 500;
                cursor: pointer;
                text-decoration: none;
                transition: background-color 0.2s;
            }

            .retry-btn:hover {
                background: #4338ca;
            }

            .features-list {
                margin-top: 2rem;
                text-align: left;
                max-width: 400px;
            }

            .features-list h3 {
                margin-bottom: 1rem;
                color: #1f2937;
            }

            .features-list ul {
                list-style: none;
                padding: 0;
            }

            .features-list li {
                padding: 0.5rem 0;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .features-list li::before {
                content: "✓";
                color: #10b981;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <svg class="offline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="m12 1 0 6"></path>
            <path d="m12 17 0 6"></path>
            <path d="m4.2 4.2 4.2 4.2"></path>
            <path d="m15.6 15.6 4.2 4.2"></path>
            <path d="m1 12 6 0"></path>
            <path d="m17 12 6 0"></path>
            <path d="m4.2 19.8 4.2-4.2"></path>
            <path d="m15.6 8.4 4.2-4.2"></path>
        </svg>

        <h1 class="offline-title">You're Offline</h1>
        <p class="offline-message">
            No internet connection detected. IconForge works offline with cached data, 
            but some features may be limited until you're back online.
        </p>

        <button class="retry-btn" onclick="window.location.reload()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M1 4v6h6M23 20v-6h-6"></path>
                <path d="m20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
            </svg>
            Try Again
        </button>

        <div class="features-list">
            <h3>Available Offline:</h3>
            <ul>
                <li>Generate icons from uploaded images</li>
                <li>Create text-based icons</li>
                <li>Download generated icons</li>
                <li>Access cached images and settings</li>
            </ul>
        </div>
    </body>
    </html>
  `;

  return new Response(offlineHTML, {
    headers: { 'Content-Type': 'text/html' }
  });
}

/**
 * Handle background sync for offline actions
 */
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync', event.tag);

  if (event.tag === 'sync-icons') {
    event.waitUntil(syncGeneratedIcons());
  }
});

/**
 * Sync generated icons when back online
 */
async function syncGeneratedIcons() {
  try {
    // Open IndexedDB and sync any pending data
    console.log('Service Worker: Syncing generated icons');

    // Notify all clients about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        data: { syncType: 'icons' }
      });
    });

  } catch (error) {
    console.error('Service Worker: Sync failed', error);
  }
}

/**
 * Handle push notifications (for future enhancements)
 */
self.addEventListener('push', event => {
  console.log('Service Worker: Push received');

  const options = {
    body: 'IconForge has new features available!',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: 'iconforge-update',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/icon-32x32.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icon-32x32.png'
      }
    ]
  };

  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.title = data.title || 'IconForge';
  }

  event.waitUntil(
    self.registration.showNotification('IconForge', options)
  );
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked', event.action);

  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        // Focus existing window if available
        for (const client of clients) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }

        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
    );
  }
});

/**
 * Handle messages from main thread
 */
self.addEventListener('message', event => {
  console.log('Service Worker: Message received', event.data);

  const { type, data } = event.data;

  switch (type) {
    case 'CACHE_ICONS':
      event.waitUntil(cacheGeneratedIcons(data.icons));
      break;

    case 'CLEAR_CACHE':
      event.waitUntil(clearAllCaches());
      break;

    case 'GET_CACHE_SIZE':
      event.waitUntil(getCacheSize().then(size => {
        event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
      }));
      break;
  }
});

/**
 * Cache generated icons for offline use
 * @param {Array} icons - Generated icons data
 */
async function cacheGeneratedIcons(icons) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);

    for (const icon of icons) {
      const response = new Response(icon.dataUrl);
      await cache.put(`/generated-icon-${icon.size}`, response);
    }

    console.log('Service Worker: Generated icons cached');
  } catch (error) {
    console.error('Service Worker: Failed to cache icons', error);
  }
}

/**
 * Clear all caches
 */
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('Service Worker: All caches cleared');
  } catch (error) {
    console.error('Service Worker: Failed to clear caches', error);
  }
}

/**
 * Get total cache size
 * @returns {Promise<number>} - Cache size in bytes
 */
async function getCacheSize() {
  try {
    const cacheNames = await caches.keys();
    let totalSize = 0;

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();

      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }

    return totalSize;
  } catch (error) {
    console.error('Service Worker: Failed to calculate cache size', error);
    return 0;
  }
}