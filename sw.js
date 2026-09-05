const CACHE = "lp28-shell-v1";
const SHELL = ["/", "/manifest.webmanifest", "/logo.jpg", "/icons/lp28-192.png", "/icons/lp28-512.png"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL).catch(()=>null)));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", event => {
  const req = event.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if(req.mode === "navigate") {
    event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put("/",copy));return res;}).catch(()=>caches.match("/")));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return res;})));
});

self.addEventListener("push", event => {
 let data={}; try{data=event.data?event.data.json():{};}catch{data={message:"Nouvelle notification LP28"};}
 const options={body:data.message||"",icon:"/icons/lp28-192.png",badge:"/icons/lp28-192.png",tag:data.notificationId||"lp28-notification",renotify:true,requireInteraction:true,vibrate:[300,120,300,120,500],data:{url:data.url||"/",deliveryToken:data.deliveryToken||null}};
 event.waitUntil((async()=>{if(data.deliveryToken)fetch(`/api/push/delivery/${encodeURIComponent(data.deliveryToken)}/received`,{method:"POST"}).catch(()=>{});await self.registration.showNotification(data.title||"LP28 Suite",options);})());
});
self.addEventListener("notificationclick", event => {
 event.notification.close(); const d=event.notification.data||{};
 event.waitUntil((async()=>{if(d.deliveryToken)fetch(`/api/push/delivery/${encodeURIComponent(d.deliveryToken)}/opened`,{method:"POST"}).catch(()=>{});const url=new URL(d.url||"/",self.location.origin).href;const list=await clients.matchAll({type:"window",includeUncontrolled:true});for(const c of list){if("focus" in c){await c.focus();if("navigate" in c)await c.navigate(url);return;}}if(clients.openWindow)await clients.openWindow(url);})());
});
