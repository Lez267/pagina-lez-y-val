const CACHE='nh-static-6d756442995eb3cc';
const ASSETS=["/_next/static/chunks/0cz1d0mv5g_q7.js","/_next/static/chunks/0h-zbu_f7mqqf.css","/_next/static/chunks/0snecye1oltos.js","/_next/static/chunks/14w8pyop9tdq8.css","/_next/static/chunks/1inwntv0b4r-7.js","/_next/static/chunks/1kp48u-oysk2y.css","/_next/static/chunks/1m-zldwx993_2.js","/_next/static/chunks/1ndiddrr1d8wz.js","/_next/static/chunks/1rj7ns8rte9vc.js","/_next/static/chunks/2h-uiqov6ko3k.js","/_next/static/chunks/2rpzc0v_4ic_2.js","/_next/static/chunks/372_21ho4sbsw.js","/_next/static/chunks/3fntmmi971322.js","/_next/static/chunks/3k0owndu5v2eq.css","/_next/static/chunks/42q_hsddajq-h.js","/_next/static/chunks/turbopack-0uztzsm3_t-0u.js","/_next/static/oDoHyW5kjpln_4UJLZ2Z6/_buildManifest.js","/_next/static/oDoHyW5kjpln_4UJLZ2Z6/_clientMiddlewareManifest.js","/_next/static/oDoHyW5kjpln_4UJLZ2Z6/_ssgManifest.js","/icon-192.png","/icon-512.png","/icon.svg","/images/balloon-puppy.png","/images/cloud-clean.png","/images/cloud-dream.png","/images/cloud.png","/images/cupid-angel.png","/images/memory-1.jpg","/images/memory-2.jpg","/images/memory-3.jpg","/images/memory-4.jpg","/images/memory-5.jpg","/images/memory-6.jpg","/manifest.webmanifest","/offline.html"];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('nh-static-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const request=event.request;const url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){event.respondWith(fetch(request).catch(()=>caches.match('/offline.html')));return;}
 if(!ASSETS.includes(url.pathname)||url.search)return;
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});
