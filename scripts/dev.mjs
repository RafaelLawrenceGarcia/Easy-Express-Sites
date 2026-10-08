import { createServer } from 'node:http';
import { createServer as createVite } from 'vite';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import handler from '../api/training.js';
// The local preview always uses its isolated file backend, even when loading Vercel env exports.
delete process.env.VERCEL;
delete process.env.VERCEL_OIDC_TOKEN;
if (!process.env.TRAINING_DATA_KEY) {
  await mkdir('work', { recursive: true });
  try { process.env.TRAINING_DATA_KEY = await readFile('work/local-training-key.txt','utf8'); }
  catch (e) { if(e.code !== 'ENOENT')throw e; process.env.TRAINING_DATA_KEY = randomBytes(32).toString('hex'); await writeFile('work/local-training-key.txt',process.env.TRAINING_DATA_KEY); }
}
process.env.TRAINING_LOCAL_DIR ||= 'work/local-training';
process.env.EASY_EXPRESS_CEO_PLAYFAB_ID ||= 'ACD5808EE029F206';
const vite = await createVite({ server: { middlewareMode: true, host: '127.0.0.1' }, appType: 'spa' });
const server = createServer(async (req, res) => {
  if (req.url?.split('?')[0] === '/api/training') {
    res.status = n => { res.statusCode = n; return res; };
    res.json = p => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(p)); };
    try {
      let body = ''; for await (const part of req) { body += part; if (body.length > 100000) throw new Error('Request too large'); }
      req.body = body ? JSON.parse(body) : {}; await handler(req, res);
    } catch { res.status(400).json({ error: 'Invalid request body.' }); }
  } else vite.middlewares(req, res);
});
server.listen(5173, '127.0.0.1', () => console.log('Easy Express preview: http://127.0.0.1:5173'));
