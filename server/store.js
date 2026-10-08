import { get, put, head, BlobNotFoundError, BlobPreconditionFailedError } from '@vercel/blob';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

function key() {
  if (!process.env.TRAINING_DATA_KEY) throw Object.assign(new Error('Training storage encryption is not configured.'), { status: 503 });
  return createHash('sha256').update(process.env.TRAINING_DATA_KEY).digest();
}
export function seal(data) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}
export function unseal(data) {
  const b = Buffer.from(data, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', key(), b.subarray(0, 12));
  decipher.setAuthTag(b.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(b.subarray(28)), decipher.final()]).toString());
}
const empty = () => ({ schema: 1, employees: [], assignments: [], sessions: [], attempts: [], audit: [], rubric: { version: 'components-1', passPercent: 80, questionCount: 10 } });
const localLocks = new Map();
export class Store {
  constructor(namespace = 'production') {
    if (!/^(production|demo-[a-f0-9]{32})$/.test(namespace)) throw new Error('Invalid namespace');
    this.namespace = namespace;
    this.pathname = `training-v1/${namespace}.enc`;
  }
  async read() {
    if (process.env.TRAINING_LOCAL_DIR && !process.env.VERCEL) {
      try { return { state: unseal(await readFile(path.join(process.env.TRAINING_LOCAL_DIR, this.namespace + '.enc'), 'utf8')), etag: 'local' }; }
      catch (e) { if (e.code === 'ENOENT') return { state: empty(), etag: null }; throw e; }
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw Object.assign(new Error('Training storage is unavailable.'), { status: 503 });
    for (let retry = 0; retry < 8; retry++) {
      let metadata;
      try { metadata = await head(this.pathname, { token: process.env.BLOB_READ_WRITE_TOKEN }); }
      catch (e) { if (e instanceof BlobNotFoundError) return { state: empty(), etag: null }; throw e; }
      const result = await get(metadata.url, { access: 'private', useCache: false, token: process.env.BLOB_READ_WRITE_TOKEN });
      // Do not mistake a propagation delay or cached older body for an empty/current database.
      if (result) {
        const body = await new Response(result.stream).text();
        const contentHash = createHash('md5').update(body).digest('hex');
        const expectedHash = metadata.etag.replace(/^W\//, '').replaceAll('"', '');
        // CDN compression can alter the response ETag. Validate our single-part body hash
        // against storage metadata rather than confusing a content encoding with a revision.
        if (result.blob.etag === metadata.etag || contentHash === expectedHash) return { state: unseal(body), etag: metadata.etag };
        if (process.env.TRAINING_STORAGE_DEBUG === '1') console.warn('Training revision mismatch', metadata.etag, result.blob.etag, contentHash);
      }
      await new Promise(resolve => setTimeout(resolve, 100 + retry * 100));
    }
    throw Object.assign(new Error('Training storage is synchronizing. Please retry shortly.'), { status: 503 });
  }
  async transaction(change) {
    if (process.env.TRAINING_LOCAL_DIR && !process.env.VERCEL) {
      const previous = localLocks.get(this.namespace) || Promise.resolve();
      const operation = previous.catch(() => {}).then(async () => {
        const { state } = await this.read();
        const result = change(state);
        await mkdir(process.env.TRAINING_LOCAL_DIR, { recursive: true });
        await writeFile(path.join(process.env.TRAINING_LOCAL_DIR, this.namespace + '.enc'), seal(state));
        return result;
      });
      localLocks.set(this.namespace, operation);
      return operation;
    }
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const { state, etag } = await this.read();
        const result = change(state), body = seal(state);
        if (body.length > 8_000_000) throw Object.assign(new Error('Workspace storage limit reached. Archive records before continuing.'), { status: 503 });
        await put(this.pathname, body, { access: 'private', token: process.env.BLOB_READ_WRITE_TOKEN,
          contentType: 'application/octet-stream', addRandomSuffix: false, allowOverwrite: Boolean(etag), ...(etag ? { ifMatch: etag } : {}), cacheControlMaxAge: 0 });
        return result;
      } catch (e) {
        if (!(e instanceof BlobPreconditionFailedError) && !(e instanceof BlobNotFoundError) && !/already exists|conditional request cannot succeed due to a conflicting operation/i.test(e.message)) throw e;
        await new Promise(resolve => setTimeout(resolve, 40 + Math.random() * 160));
      }
    }
    throw Object.assign(new Error('Workspace changed concurrently. Please retry.'), { status: 409 });
  }
}
