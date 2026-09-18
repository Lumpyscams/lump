/**
 * Service Worker for Lumpo PWA
 * Location: /sw.js
 * Purpose: Handles offline caching and ensures the app works without an internet connection.
 */
const CACHE_NAME = 'lumpo-cache-v14';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './utils.js',
  './logger.js',
  './uiManager.js',
  './timerManager.js',
  './dataProcessor.js',
  './bluetoothManager.js',
  './manifest.json',
  './lumpo192.png',
  './lumpo512.png'
];

// On install, open the cache and store all listed assets
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// On activation, prune old caches that don't match the current CACHE_NAME.
// This ensures the user's device doesn't fill up with outdated versions of the app.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Network-first strategy: Attempt to fetch from the network first to ensure
// the latest version is loaded during development.
// Falls back to the cache only if the network request fails (e.g., offline).
self.addEventListener('fetch', (e) => {
  // Only handle standard GET requests; ignore POST/PUT or extension-level requests
  if (e.request.method !== 'GET' || !e.request.url.startsWith('http')) return;

  e.respondWith(
    fetch(e.request, { cache: 'no-store' }).catch(() => caches.match(e.request))
  );
});