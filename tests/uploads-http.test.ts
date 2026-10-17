import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeUploadRequest, readSmallBody, requestError, sameOrigin } from '../server/http';

const url = 'https://garden.example/api/uploads/sign';
test('upload authorization rejects anonymous and cross-site requests before touching Cloudinary', async () => {
  await assert.rejects(authorizeUploadRequest(new Request(url), {}), /Google/);
  assert.throws(() => sameOrigin(new Request(url, { headers: { Origin: 'https://another.example' } })), /este sitio/);
  assert.throws(() => sameOrigin(new Request(url, { headers: { 'Sec-Fetch-Site': 'cross-site' } })), /este sitio/);
  assert.doesNotThrow(() => sameOrigin(new Request(url, { headers: { Origin: 'https://garden.example', 'Sec-Fetch-Site': 'same-origin' } })));
});

test('the upload HTTP adapter caps declared and actual body sizes', async () => {
  await assert.rejects(readSmallBody(new Request(url, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json', 'Content-Length': '501' } })), /grande/);
  await assert.rejects(readSmallBody(new Request(url, { method: 'POST', body: 'x'.repeat(501), headers: { 'Content-Type': 'application/json' } })), /grande/);
  await assert.rejects(readSmallBody(new Request(url, { method: 'POST', body: '{}', headers: { 'Content-Type': 'text/plain' } })), /JSON/);
  const body = await readSmallBody(new Request(url, { method: 'POST', body: '{"kind":"image","bytes":123}', headers: { 'Content-Type': 'application/json' } }));
  assert.equal(new TextDecoder().decode(body), '{"kind":"image","bytes":123}');
});

test('unexpected upstream errors cannot reveal credentials or private content', async () => {
  const response = requestError(new Error('PRIVATE_UPSTREAM_DETAIL'));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.equal((await response.text()).includes('PRIVATE_UPSTREAM_DETAIL'), false);
});
