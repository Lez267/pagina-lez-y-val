import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = path.resolve(fs.existsSync('dist/client') ? 'dist/client' : 'dist');
const files = ['/'];
function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) { if (!entry.name.startsWith('.')) collect(full); }
    else if (/\.(?:js|css|woff2?|png|jpe?g|webp|svg|ico|webmanifest)$/.test(entry.name) && entry.name !== 'sw.js') {
      files.push('/' + path.relative(root, full).split(path.sep).join('/'));
    }
  }
}
collect(root);
const revision = crypto.createHash('sha256').update(files.map(file => file + (file === '/' ? '' : fs.readFileSync(path.join(root, file)))).join('\n')).digest('hex').slice(0,12);
const source = `const CACHE='nh-static-${revision}';
const ASSETS=${JSON.stringify(files)};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('nh-static-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const request=event.request;const url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){event.respondWith(fetch(request).catch(()=>caches.match('/')));return;}
 if(!ASSETS.includes(url.pathname)||url.search)return;
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});
`;
fs.writeFileSync(path.join(root,'sw.js'),source);
if (fs.existsSync('public')) {
  fs.writeFileSync(path.join('public', 'sw.js'), source);
}
console.log('PWA: cached static interface and example images only; no gallery records or remote photos.');
