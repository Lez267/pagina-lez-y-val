const CACHE='nh-static-8b9021b18fbb';
const ASSETS=["/","/_next/static/06f417a6-2fae-40c7-b79b-916211ed483a/_buildManifest.js","/_next/static/06f417a6-2fae-40c7-b79b-916211ed483a/_ssgManifest.js","/_next/static/chunks/app-route-prefetch-policy-Bvu2fGRZ.js","/_next/static/chunks/firebase-DsfYPjOp.js","/_next/static/chunks/framework-D_rUT4EX.js","/_next/static/chunks/gallery-8BkhriXg.js","/_next/static/chunks/gallery-upload-DLFWdFb1.js","/_next/static/chunks/gallery-write-R4BMuPFe.js","/_next/static/chunks/index-BK8EVbO7.js","/_next/static/chunks/layout-segment-context-DKF-z5lN.js","/_next/static/chunks/page-CF7UOq7A.js","/_next/static/chunks/rolldown-runtime-C60lm6uB.js","/_next/static/chunks/streamed-icons-Cs-m6aYg.js","/_next/static/css/index.BJF1z0m7.css","/_next/static/css/page.Bfz172Gn.css","/icon-192.png","/icon-512.png","/icon.svg","/images/balloon-puppy.png","/images/cloud-clean.png","/images/cloud-dream.png","/images/cloud.png","/images/cupid-angel.png","/images/memory-1.jpg","/images/memory-2.jpg","/images/memory-3.jpg","/images/memory-4.jpg","/images/memory-5.jpg","/images/memory-6.jpg","/manifest.webmanifest"];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('nh-static-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const request=event.request;const url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){event.respondWith(fetch(request).catch(()=>caches.match('/')));return;}
 if(!ASSETS.includes(url.pathname)||url.search)return;
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});
