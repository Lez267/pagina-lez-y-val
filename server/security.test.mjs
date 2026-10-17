import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac, createSign, generateKeyPairSync, webcrypto } from 'node:crypto';
import { verifyFirebaseToken, FIREBASE_ISSUER, FIREBASE_PROJECT_ID, GOOGLE_JWKS_URL } from './firebase-auth.mjs';
import { buildUploadSignature, getUploadStatus } from './cloudinary-signature.mjs';
import { parseAllowedUids, parseUploadRequest, IMAGE_BYTE_LIMIT, VIDEO_BYTE_LIMIT } from './validators.mjs';

if (!globalThis.crypto) Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
const NOW = Date.UTC(2026, 9, 17, 12);
const SECONDS = NOW / 1000;
const UID = 'fixture-google-uid';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicJwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' };
const baseClaims = { iss: FIREBASE_ISSUER, aud: FIREBASE_PROJECT_ID, sub: UID, user_id: UID, iat: SECONDS, exp: SECONDS + 3600, auth_time: SECONDS - 10, email: 'fixture@example.invalid', email_verified: true, firebase: { sign_in_provider: 'google.com' } };
function token(overrides = {}, headerOverrides = {}) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'test-key', ...headerOverrides })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...baseClaims, ...overrides })).toString('base64url');
  const signature = createSign('RSA-SHA256').update(`${header}.${body}`).sign(privateKey).toString('base64url');
  return `${header}.${body}.${signature}`;
}
const fetchKeys = async url => { assert.equal(url, GOOGLE_JWKS_URL); return { keys: [publicJwk], maxAgeSeconds: 3600 }; };
const options = (extra = {}) => ({ allowedUids: [UID], fetchJwks: fetchKeys, now: NOW, ...extra });
const env = { CLOUDINARY_CLOUD_NAME: 'dc7x4qjzu', CLOUDINARY_API_KEY: '123456789012345', CLOUDINARY_API_SECRET: 'fixture-secret-never-a-real-credential', FIREBASE_ALLOWED_UIDS: UID };
const nonce = () => 'fixture-random-id-000000001';
const signatureArgs = extra => ({ uid: UID, kind: 'image', bytes: 1024, env, now: NOW, randomId: nonce, ...extra });

test('verifies a real RS256 signature and returns only a minimal immutable principal', async () => {
  const result = await verifyFirebaseToken(token(), options());
  assert.deepEqual(result, { uid: UID, provider: 'google.com', authTime: SECONDS - 10, issuedAt: SECONDS, expiresAt: SECONDS + 3600 });
  assert.ok(Object.isFrozen(result)); assert.equal('email' in result, false); assert.equal('token' in result, false);
});

test('rejects payload tampering, invalid signatures, none/HS256 and attacker key URLs', async () => {
  const original = token(); const parts = original.split('.');
  parts[1] = Buffer.from(JSON.stringify({ ...baseClaims, sub: 'another-uid', user_id: 'another-uid' })).toString('base64url');
  await assert.rejects(verifyFirebaseToken(parts.join('.'), options({ allowedUids: [UID, 'another-uid'] })), { code: 'INVALID_TOKEN' });
  const invalidSignature = original.split('.'); invalidSignature[2] = Buffer.alloc(256, 0).toString('base64url');
  await assert.rejects(verifyFirebaseToken(invalidSignature.join('.'), options()), { code: 'INVALID_TOKEN' });
  for (const header of [{ alg: 'none' }, { alg: 'HS256' }, { jku: 'https://attacker.invalid/jwks' }, { jwk: publicJwk }, { crit: ['b64'], b64: false }]) {
    let calls = 0;
    await assert.rejects(verifyFirebaseToken(token({}, header), options({ fetchJwks: async () => { calls++; return { keys: [publicJwk] }; } })), { code: 'INVALID_TOKEN' });
    assert.equal(calls, 0);
  }
});

test('rejects wrong Firebase project, issuer, temporal claims and unverified/non-Google identities', async () => {
  const cases = [
    { aud: 'galeria-lezz-y-val' }, { iss: 'https://securetoken.google.com/galeria-lezz-y-val' },
    { exp: SECONDS }, { iat: SECONDS + 1 }, { auth_time: SECONDS + 1 }, { auth_time: SECONDS + .5 },
    { exp: SECONDS + 3601 }, { iat: 'not-a-number' }, { sub: '' }, { user_id: 'wrong' },
    { email_verified: false }, { email_verified: 'true' }, { email: '' }, { firebase: { sign_in_provider: 'password' } },
  ];
  for (const claims of cases) await assert.rejects(verifyFirebaseToken(token(claims), options()), { code: 'INVALID_TOKEN' });
  await assert.rejects(verifyFirebaseToken(token(), options({ allowedUids: ['another-uid'] })), { code: 'FORBIDDEN', status: 403 });
});

test('key cache shares concurrent fetches, honors expiry and limits unknown-kid refreshes', async () => {
  let calls = 0; let keys = [publicJwk];
  const fetcher = async url => { assert.equal(url, GOOGLE_JWKS_URL); calls++; await Promise.resolve(); return { keys, maxAgeSeconds: 3600 }; };
  await Promise.all(Array.from({ length: 8 }, () => verifyFirebaseToken(token(), options({ fetchJwks: fetcher }))));
  assert.equal(calls, 1);
  const rotated = token({}, { kid: 'rotated-key' });
  keys = [publicJwk, { ...publicJwk, kid: 'rotated-key' }];
  await assert.rejects(verifyFirebaseToken(rotated, options({ fetchJwks: fetcher, now: NOW + 20000 })), { code: 'INVALID_TOKEN' });
  assert.equal(calls, 1);
  await verifyFirebaseToken(rotated, options({ fetchJwks: fetcher, now: NOW + 31000 }));
  assert.equal(calls, 2);
  let expiringCalls = 0;
  const expiring = async () => { expiringCalls++; return { keys: [publicJwk], maxAgeSeconds: 1 }; };
  await verifyFirebaseToken(token(), options({ fetchJwks: expiring }));
  await verifyFirebaseToken(token(), options({ fetchJwks: expiring, now: NOW + 2000 }));
  assert.equal(expiringCalls, 2);
});

test('malformed/unavailable/public-private key mixtures fail closed without leaking errors', async () => {
  for (const keys of [[], Array.from({ length: 9 }, (_, index) => ({ ...publicJwk, kid: `key-${index}` })), [{ ...publicJwk, n: 'AQ' }], [{ ...publicJwk, d: 'fixture-private-value' }], [{ ...publicJwk, alg: 'HS256' }]]) {
    await assert.rejects(verifyFirebaseToken(token(), options({ fetchJwks: async () => ({ keys }) })), { code: 'KEYS_UNAVAILABLE', status: 503 });
  }
  await assert.rejects(verifyFirebaseToken(token(), options({ fetchJwks: async () => { throw new Error('UPSTREAM_SECRET_MUST_NOT_LEAK'); } })), error => error.code === 'KEYS_UNAVAILABLE' && !error.message.includes('UPSTREAM_SECRET'));
  await assert.rejects(verifyFirebaseToken(token(), options({ allowedUids: [] })), { code: 'AUTH_NOT_CONFIGURED' });
  await assert.rejects(verifyFirebaseToken(token(), options({ fetchJwks: undefined })), { code: 'AUTH_NOT_CONFIGURED' });
});

test('Cloudinary fixture matches SHA256(sorted parameters + secret), not HMAC', async () => {
  const result = await buildUploadSignature(signatureArgs());
  const canonical = Object.keys(result.params).sort().map(key => `${key}=${result.params[key]}`).join('&');
  const expected = createHash('sha256').update(canonical + env.CLOUDINARY_API_SECRET).digest('hex');
  assert.equal(result.signature, expected);
  assert.notEqual(result.signature, createHmac('sha256', env.CLOUDINARY_API_SECRET).update(canonical).digest('hex'));
  assert.equal(result.uploadUrl, 'https://api.cloudinary.com/v1_1/dc7x4qjzu/image/upload');
  assert.match(result.params.public_id, /^nuestro-universo\/[a-f0-9]{24}\/fixture-random-id-000000001$/);
  assert.equal(result.params.overwrite, 'false'); assert.equal(result.params.timestamp, String(SECONDS));
  assert.equal(result.signatureAlgorithm, 'sha256'); assert.equal(result.byteValidation, 'declaration-only');
  assert.equal(result.expiresAt, SECONDS + 3600);
  assert.equal(result.params.folder, undefined); assert.equal(result.params.asset_folder, undefined);
  assert.equal(result.params.upload_preset, undefined); assert.equal(result.params.max_file_size, undefined);
  assert.equal(JSON.stringify(result).includes(env.CLOUDINARY_API_SECRET), false);
});

test('signed format restrictions exclude SVG/PDF and namespaces are unique without changing existing files', async () => {
  const image = await buildUploadSignature(signatureArgs());
  const video = await buildUploadSignature(signatureArgs({ kind: 'video', bytes: VIDEO_BYTE_LIMIT, randomId: () => 'fixture-random-id-000000002' }));
  assert.notEqual(image.params.public_id, video.params.public_id);
  assert.ok(video.uploadUrl.endsWith('/video/upload'));
  for (const result of [image, video]) {
    assert.equal(result.params.allowed_formats.split(',').includes('svg'), false);
    assert.equal(result.params.allowed_formats.split(',').includes('pdf'), false);
    assert.equal(result.params.overwrite, 'false');
    assert.deepEqual(Object.keys(result.params).sort(), ['allowed_formats', 'overwrite', 'public_id', 'timestamp']);
  }
  const dynamic = await buildUploadSignature(signatureArgs({ env: { ...env, CLOUDINARY_FOLDER_MODE: 'dynamic' } }));
  assert.equal(dynamic.params.asset_folder, 'nuestro-universo'); assert.equal(dynamic.params.folder, undefined);
});

test('configuration status reveals only ready and rejects missing or mismatched server configuration', async () => {
  assert.deepEqual(getUploadStatus(undefined), { ready: false });
  assert.deepEqual(getUploadStatus({ FIREBASE_ALLOWED_UIDS: UID }), { ready: false });
  assert.deepEqual(getUploadStatus(env), { ready: true });
  for (const badEnv of [{ ...env, CLOUDINARY_CLOUD_NAME: 'other-cloud' }, { ...env, CLOUDINARY_API_SECRET: '' }, { ...env, CLOUDINARY_API_KEY: '' }]) {
    assert.deepEqual(getUploadStatus(badEnv), { ready: false });
    await assert.rejects(buildUploadSignature(signatureArgs({ env: badEnv })), { code: 'UPLOADS_NOT_CONFIGURED', status: 503 });
  }
  await assert.rejects(buildUploadSignature(signatureArgs({ uid: 'unauthorized' })), { code: 'FORBIDDEN' });
  await assert.rejects(buildUploadSignature(signatureArgs({ randomId: () => '../existing-image' })), { code: 'INVALID_SERVER_RANDOM' });
});

test('request parsing enforces 500 UTF8 bytes, exact fields and declared per-file limits', () => {
  assert.deepEqual(parseUploadRequest('{"kind":"image","bytes":1024}'), { kind: 'image', bytes: 1024 });
  assert.deepEqual(parseUploadRequest(new TextEncoder().encode(`{"kind":"image","bytes":${IMAGE_BYTE_LIMIT}}`)), { kind: 'image', bytes: IMAGE_BYTE_LIMIT });
  assert.throws(() => parseUploadRequest(JSON.stringify({ kind: 'image', bytes: 1, padding: '🌸'.repeat(150) })), { code: 'REQUEST_TOO_LARGE', status: 413 });
  for (const raw of ['null', '[]', '{}', '{', '{"kind":"image","bytes":0}', `{"kind":"image","bytes":${IMAGE_BYTE_LIMIT + 1}}`, '{"kind":"video","bytes":100.5}', '{"kind":"svg","bytes":1}', '{"kind":"image","bytes":1,"overwrite":true}', '{"kind":"image","bytes":1,"public_id":"existing"}', '{"kind":"image","bytes":1,"uid":"attacker"}']) assert.throws(() => parseUploadRequest(raw));
});

test('allowlist parser accepts only explicit server UIDs and does not broaden authorization', () => {
  assert.deepEqual([...parseAllowedUids(`${UID}, another-uid`)], [UID, 'another-uid']);
  assert.deepEqual([...parseAllowedUids(JSON.stringify([UID]))], [UID]);
  for (const value of ['', '*', null, '[]', 'user@example.invalid', { uid: UID }]) assert.throws(() => parseAllowedUids(value), { code: 'AUTH_NOT_CONFIGURED' });
});
