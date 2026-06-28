const CACHE_NAME = 'trainmaster-pro-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalação do Service Worker e Cache Inicial
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Alguns assets não puderam ser cacheados na instalação:', err);
      });
    })
  );
  self.skipWaiting();
});

// Ativação do Service Worker e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercepção de requisições (Fetch) com estratégia Network First (Rede Primeiro)
self.addEventListener('fetch', (event) => {
  // Ignorar requisições não-GET
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Ignorar requisições de extensões, HMR (Hot Module Replacement) ou protocolos não-HTTP
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se for uma resposta válida do nosso próprio domínio, salvar no cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Se a rede falhar, tentar buscar no cache
        return caches.match(event.request);
      })
  );
});
