/* Organika POS — offline app shell. Put this file next to index.html. */
const CACHE = 'organika-pos-v1';
const PRECACHE = [
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];
const CDN_HOSTS = ['www.gstatic.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e=>{
  self.skipWaiting();
  e.waitUntil((async()=>{
    const c = await caches.open(CACHE);
    await Promise.all(PRECACHE.map(u=>fetch(u,{mode:'cors'}).then(r=>{ if(r.ok) return c.put(u,r); }).catch(()=>{})));
    await fetch(self.registration.scope,{cache:'reload'}).then(r=>{ if(r.ok) return c.put(self.registration.scope,r); }).catch(()=>{});
  })());
});
self.addEventListener('activate', e=>{
  e.waitUntil((async()=>{
    for(const k of await caches.keys()){ if(k!==CACHE) await caches.delete(k); }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin === self.location.origin) e.respondWith(networkFirst(req));
  else if(CDN_HOSTS.includes(url.host)) e.respondWith(cacheFirst(req));
});
// 页面：有网就取最新版；网络卡（3 秒没回应）或断网就用已缓存的版本，后台继续更新
async function networkFirst(req){
  const cache = await caches.open(CACHE);
  const key = req.mode === 'navigate' ? self.registration.scope : req;
  const fresh = fetch(req).then(r=>{ if(r && r.ok) cache.put(key, r.clone()); return r; });
  fresh.catch(()=>{});
  const timeout = new Promise(res=>setTimeout(()=>res(null), 3000));
  try{ const r = await Promise.race([fresh, timeout]); if(r) return r; }catch(err){}
  const cached = await cache.match(key, {ignoreSearch:true});
  return cached || fresh;
}
async function cacheFirst(req){
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if(hit) return hit;
  const r = await fetch(req);
  if(r && (r.ok || r.type === 'opaque')) cache.put(req, r.clone());
  return r;
}
