// Smart21Institution — makes the key pair used for web push notifications.
//   node scripts/generate-vapid.mjs
// Prints the PRIVATE key (give it to Cloudflare as a secret — never put it in the code) and the public key
// (the app fetches the public key from the server by itself; you do not have to paste it anywhere).
//
//   wrangler secret put VAPID_PRIVATE_JWK      ← paste the one-line JSON printed below
//   wrangler secret put VAPID_SUBJECT          ← optional: mailto:you@your-domain
import { webcrypto as crypto } from 'node:crypto';

const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
const b64u = (s) => Buffer.from(s, 'base64url');
const pub = Buffer.concat([Buffer.from([4]), b64u(jwk.x), b64u(jwk.y)]).toString('base64url');
console.log('\nPRIVATE key (secret) — paste when wrangler asks for VAPID_PRIVATE_JWK:\n');
console.log(JSON.stringify({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d }));
console.log('\nPublic key (for your records):\n\n' + pub + '\n');
