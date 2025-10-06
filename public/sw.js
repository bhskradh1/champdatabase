// Service Worker for offline functionality
const CACHE_NAME = 'champ-database-v1';
const STATIC_CACHE = 'champ-static-v1';
const DYNAMIC_CACHE = 'champ-dynamic-v1';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests
  if (request.method === 'GET') {
    // For static assets, try cache first
    if (url.pathname.startsWith('/static/') || 
        url.pathname.endsWith('.js') || 
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.jpg') ||
        url.pathname.endsWith('.svg')) {
      
      event.respondWith(
        caches.match(request)
          .then((response) => {
            if (response) {
              return response;
            }
            
            return fetch(request).then((response) => {
              // Cache successful responses
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE).then((cache) => {
                  cache.put(request, responseClone);
                });
              }
              return response;
            });
          })
      );
    }
    
    // For API requests, try network first, then cache
    else if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            // Cache successful API responses
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // If network fails, try to serve from cache
            return caches.match(request);
          })
      );
    }
    
    // For HTML pages, try network first, then cache
    else {
      event.respondWith(
        fetch(request)
          .then((response) => {
            // Cache successful responses
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // If network fails, try to serve from cache
            return caches.match(request)
              .then((response) => {
                if (response) {
                  return response;
                }
                // Fallback to index.html for SPA routing
                return caches.match('/index.html');
              });
          })
      );
    }
  }
  
  // For POST/PUT/DELETE requests, always try network first
  else {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // If offline, we can't make these requests
          return new Response(
            JSON.stringify({ 
              error: 'Offline - request queued for sync',
              offline: true 
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
  }
});

// Background sync for offline requests
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'data-sync') {
    event.waitUntil(
      // This will be handled by the main app
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_REQUEST' });
        });
      })
    );
  }
});

// Handle messages from main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notifications (if needed in future)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'champ-database-notification'
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll().then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow('/');
      }
    })
  );
});
