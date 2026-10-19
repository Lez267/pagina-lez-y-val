import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const entries = new Map();
function collect(directory, prefix) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    const url = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') collect(full, url);
    } else if (/\.(?:js|css|woff2?|png|jpe?g|webp|svg|ico|webmanifest|html)$/.test(entry.name) && entry.name !== 'sw.js') {
      entries.set(url, full);
    }
  }
}
// Use this Next build even when an older Vinext dist/ remains in the checkout.
collect('public', '');
collect('.next/static', '/_next/static');
if (!fs.existsSync('.next/BUILD_ID')) throw new Error('Compile Next before generating the service worker.');
const hash = crypto.createHash('sha256').update(fs.readFileSync('.next/BUILD_ID'));
for (const [url, file] of [...entries].sort(([a], [b]) => a.localeCompare(b))) hash.update(url).update(fs.readFileSync(file));
const revision = hash.digest('hex').slice(0,16);
const files = [...entries.keys()].sort();

const source = `const CACHE='nh-static-${revision}';
const ASSETS=${JSON.stringify(files)};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('nh-static-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const request=event.request;const url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){event.respondWith(fetch(request).catch(()=>caches.match('/offline.html')));return;}
 if(!ASSETS.includes(url.pathname)||url.search)return;
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});
`;

fs.writeFileSync('public/sw.js', source);
console.log(`PWA: ${files.length} current static assets; no private records, API, remote photos or audio.`);
