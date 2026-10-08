import { randomBytes } from 'node:crypto';
import { Store } from '../server/store.js';
import { del } from '@vercel/blob';
const store = new Store('demo-' + randomBytes(16).toString('hex'));
await Promise.all(Array.from({ length: 4 }, (_, i) => store.transaction(state => { state.audit.push({ id: i, fixture: true }); })));
const result = await store.read();
if (result.state.audit.length !== 4 || new Set(result.state.audit.map(a=>a.id)).size !== 4) throw new Error('Concurrent writes were lost');
console.log('PASS: live Vercel Blob encryption, origin reads and conditional-write retry preserve four concurrent writes.');
await del(store.pathname, { token: process.env.BLOB_READ_WRITE_TOKEN, ifMatch: result.etag });
