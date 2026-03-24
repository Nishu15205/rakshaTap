/**
 * RakshaTap Service Worker
 * HackXtreme Edition - Full Offline Support with Background Sync
 * 
 * Enables complete offline functionality:
 * - Caches all app assets
 * - Provides offline fallback
 * - Enables PWA installation
 * - Background sync for pending SOS alerts
 * - Push notifications
 */

const CACHE_NAME = 'rakshatap-v1.0.1';
const RUNTIME_CACHE = 'rakshatap-runtime-v1';

// Assets to cache on install (core app files)
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.svg',
  '/favicon.svg',
];

// WebLLM model files to cache (when loaded)
const MODEL_CACHE_PATTERNS = [
  'huggingface.co',
  'mlc-ai',
  '.wasm',
  '.onnx',
  '.bin',
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching app shell');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Precache failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (except for background sync)
  if (request.method !== 'GET') {
    return;
  }

  // Check if this is a model file (WebLLM)
  const isModelFile = MODEL_CACHE_PATTERNS.some(pattern => 
    url.href.includes(pattern)
  );

  if (isModelFile) {
    // Cache model files with cache-first strategy
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((response) => {
            cache.put(request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  // Skip cross-origin requests (except for maps and fonts)
  const isExternal = url.origin !== location.origin;
  const isAllowedExternal = 
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');

  if (isExternal && !isAllowedExternal) {
    return;
  }

  // Handle API requests - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached response if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // Handle navigation requests - serve cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/')
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached page, then update in background
            fetch(request).then((response) => {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put('/', response);
              });
            }).catch(() => {});
            return cachedResponse;
          }
          
          // If not in cache, fetch from network
          return fetch(request)
            .then((response) => {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put('/', responseClone);
              });
              return response;
            })
            .catch(() => {
              // Ultimate fallback - return cached index
              return caches.match('/');
            });
        })
    );
    return;
  }

  // Handle static assets - cache first, network fallback
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached, update in background
          fetch(request).then((response) => {
            if (response.ok) {
              caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(request, response);
              });
            }
          }).catch(() => {});
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Cache successful responses
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch((error) => {
            console.error('[SW] Fetch failed:', error);
            
            // Return offline fallback for HTML pages
            if (request.headers.get('Accept')?.includes('text/html')) {
              return caches.match('/');
            }
            
            throw error;
          });
      })
  );
});

// ============================================
// BACKGROUND SYNC
// ============================================

// Store pending alerts in IndexedDB
const DB_NAME = 'RakshaTapDB';
const STORE_NAME = 'pendingAlerts';

// Open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Save pending alert to IndexedDB
async function savePendingAlert(alert: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add({
      ...alert,
      timestamp: Date.now(),
    });
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Get all pending alerts
async function getPendingAlerts(): Promise<unknown[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Clear pending alerts
async function clearPendingAlerts(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Delete single alert
async function deletePendingAlert(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Handle background sync
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'sos-sync') {
    event.waitUntil(syncSOSAlerts());
  }
  
  if (event.tag === 'contact-sync') {
    event.waitUntil(syncContacts());
  }
});

// Sync SOS alerts when back online
async function syncSOSAlerts(): Promise<void> {
  try {
    const pendingAlerts = await getPendingAlerts();
    console.log('[SW] Syncing', pendingAlerts.length, 'pending alerts');
    
    for (const alert of pendingAlerts) {
      try {
        const response = await fetch('/api/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert),
        });
        
        if (response.ok) {
          await deletePendingAlert((alert as { id: number }).id);
          console.log('[SW] Alert synced successfully');
        }
      } catch (error) {
        console.error('[SW] Failed to sync alert:', error);
      }
    }
    
    // Notify the app that sync is complete
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        syncedCount: pendingAlerts.length,
      });
    });
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// Sync contacts
async function syncContacts(): Promise<void> {
  console.log('[SW] Syncing contacts...');
  // Implementation would sync contacts with server if needed
}

// ============================================
// PUSH NOTIFICATIONS
// ============================================

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  
  const options: NotificationOptions = {
    body: data.body || 'Emergency alert!',
    icon: '/logo.svg',
    badge: '/logo.svg',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'emergency',
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'View App' },
      { action: 'call', title: 'Call 112' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    data: data,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'RakshaTap', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data || {};
  
  if (action === 'call' || data.type === 'emergency') {
    // Open dialer with emergency number
    event.waitUntil(
      self.clients.openWindow('tel:112')
    );
  } else if (action === 'view' || !action) {
    // Open the app
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        // If app is already open, focus it
        for (const client of clients) {
          if ((client as WindowClient).focused) {
            return (client as WindowClient).focus();
          }
        }
        // Otherwise open new window
        return self.clients.openWindow('/');
      })
    );
  }
});

// ============================================
// MESSAGE HANDLING
// ============================================

self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
  
  if (event.data.type === 'SAVE_PENDING_ALERT') {
    event.waitUntil(
      savePendingAlert(event.data.alert)
    );
  }
  
  if (event.data.type === 'TRIGGER_SYNC') {
    // Register a sync event
    self.registration.sync.register('sos-sync').then(() => {
      console.log('[SW] Sync registered');
    }).catch((error) => {
      console.error('[SW] Sync registration failed:', error);
    });
  }
});

// ============================================
// PERIODIC BACKGROUND SYNC (if supported)
// ============================================

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-emergencies') {
    event.waitUntil(checkForEmergencies());
  }
});

async function checkForEmergencies(): Promise<void> {
  // Check for any pending emergencies that need attention
  console.log('[SW] Periodic check for emergencies');
}

console.log('[SW] RakshaTap Service Worker loaded - HackXtreme Edition with Background Sync');
