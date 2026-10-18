const CACHE='nh-static-55bb6494593e';
const ASSETS=["/","/icon-192.png","/icon-512.png","/icon.svg","/images/balloon-puppy.png","/images/cloud-clean.png","/images/cloud-dream.png","/images/cloud.png","/images/cupid-angel.png","/images/memory-1.jpg","/images/memory-2.jpg","/images/memory-3.jpg","/images/memory-4.jpg","/images/memory-5.jpg","/images/memory-6.jpg","/manifest.webmanifest"];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('nh-static-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const request=event.request;const url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){event.respondWith(fetch(request).catch(()=>caches.match('/')));return;}
 if(!ASSETS.includes(url.pathname)||url.search)return;
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});
