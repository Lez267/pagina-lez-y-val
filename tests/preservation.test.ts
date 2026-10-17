import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { importIdentity } from '../src/lib/import-identity';

test('distinct backup contents cannot share their local namespace merely by having the same IDs', async () => {
  const first = [{id:'import-1',description:'First backup'}];
  const second = [{id:'import-1',description:'Another backup'}];
  assert.notEqual(await importIdentity(first),await importIdentity(second));
  assert.equal(await importIdentity(first),await importIdentity(structuredClone(first)));
});
test('gallery connector exposes no data mutation or file upload operation', () => {
  const source = fs.readFileSync(new URL('../src/data/firebase.ts',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction|uploadBytes|deleteObject)\b/);
  assert.match(source,/getDocs\(collection\(getFirestore\(auth.app\), 'memories'\)\)/);
});
test('the new gallery is restricted to the independent Firebase project', () => {
  const config = fs.readFileSync(new URL('../src/data/firebase-config.ts',import.meta.url),'utf8');
  const connector = fs.readFileSync(new URL('../src/data/firebase.ts',import.meta.url),'utf8');
  assert.match(config,/"projectId": "lezz-val-universo"/);
  assert.doesNotMatch(config,/galeria-lezz-y-val/);
  assert.match(connector,/app\.options\.projectId !== 'lezz-val-universo'/);
});
test('offline interface excludes remote gallery data from its cache policy', () => {
  const source = fs.readFileSync(new URL('../scripts/generate-sw.mjs',import.meta.url),'utf8');
  assert.match(source,/url.origin!==self.location.origin/);
  assert.match(source,/!ASSETS.includes\(url.pathname\)/);
  assert.doesNotMatch(source,/firestore\.googleapis|res\.cloudinary|memories\.json/);
});
