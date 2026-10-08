import { randomBytes, createHash } from 'node:crypto';
import { Store, seal, unseal } from '../server/store.js';
import { identity, isCEO, playfab } from '../server/playfab.js';
import * as core from '../server/core.js';
import { head, issueSignedToken, presignUrl } from '@vercel/blob';

const cookieName = 'ee_training';
function cookie(req) {
  const token = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  try { const p = unseal(token || ''); return p.exp > Date.now() ? p : null; } catch { return null; }
}
function setCookie(req, res, p) {
  res.setHeader('Set-Cookie', `${cookieName}=${p ? seal(p) : ''}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${p ? 14400 : 0}${process.env.VERCEL || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`);
}
async function authenticate(req) {
  const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  const c = bearer ? { ticket: bearer } : cookie(req);
  if (!c) core.fail('Sign in is required.', 401);
  if (c.demo && !bearer) return { id: c.id, role: c.role, demo: true, namespace: c.namespace };
  const i = await identity(c.ticket);
  const { state } = await new Store().read();
  const employee = state.employees.find(e => e.id === i.id);
  return { ...i, ticket: c.ticket, role: isCEO(i.id) ? 'ceo' : employee?.role === 'admin' ? 'admin' : 'employee', demo: false, namespace: 'production' };
}
async function throttle(req, kind) {
  const ip = (req.headers['x-forwarded-for'] || 'local').split(',')[0];
  const id = createHash('sha256').update(ip + kind).digest('hex');
  await new Store().transaction(state => {
    state.rates = (state.rates || []).filter(r => r.until > Date.now());
    let rate = state.rates.find(r => r.id === id);
    if (!rate) { rate = { id, count: 0, until: Date.now() + 600000 }; state.rates.push(rate); }
    if (++rate.count > 30) core.fail('Too many requests. Try again in ten minutes.', 429);
  });
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  // Cookie requests must be same-origin. Unity uses authenticated bearer requests without Origin.
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (origin) { let originHost; try { originHost = new URL(origin).host; } catch { return res.status(403).json({ error: 'Invalid request origin.' }); } if (originHost !== host) return res.status(403).json({ error: 'Cross-origin requests are not allowed.' }); }
  if (JSON.stringify(req.body || {}).length > 100000) return res.status(413).json({ error: 'Request is too large.' });
  try {
    const input = req.body || {}, action = input.action;
    if (action === 'logout') { setCookie(req, res, null); return res.json({ ok: true }); }
    if (action === 'login') {
      await throttle(req, 'login');
      const email = core.text(input.email, 'Email', 254), password = input.password;
      if (typeof password !== 'string' || !password.length || password.length > 256) core.fail('Enter your password.');
      const p = await playfab('LoginWithEmailAddress', { Email: email, Password: password });
      const i = await identity(p.SessionTicket);
      const data = await new Store().transaction(state => {
        const actor = { ...i, role: isCEO(i.id) ? 'ceo' : state.employees.find(e => e.id === i.id)?.role === 'admin' ? 'admin' : 'employee', demo: false };
        if (actor.role === 'ceo' && !state.employees.some(e => e.id === i.id)) state.employees.push({ ...i, role: actor.role, group: 'Training administration', active: true, createdAt: core.now() });
        return core.snapshot(state, actor);
      });
      setCookie(req, res, { ticket: p.SessionTicket, exp: Date.now() + 14400000 }); return res.json({ data });
    }
    if (action === 'recover') {
      await throttle(req, 'recover');
      await playfab('SendAccountRecoveryEmail', { Email: core.text(input.email, 'Email', 254) });
      return res.json({ message: 'If this email is registered, check your inbox for recovery instructions.' });
    }
    if (action === 'demo') {
      let c = cookie(req);
      if (!c?.demo) {
        await throttle(req, 'demo');
        c = { demo: true, namespace: 'demo-' + randomBytes(16).toString('hex'), id: 'DEMOADMIN', role: 'ceo', exp: Date.now() + 14400000 };
      }
      const data = await new Store(c.namespace).transaction(state => { core.seedDemo(state); return core.snapshot(state, c); });
      setCookie(req, res, c); return res.json({ data });
    }
    const actor = await authenticate(req), store = new Store(actor.namespace);
    if (action === 'demoRole') {
      if (!actor.demo) core.fail('Role switching is available only in the demonstration.', 403);
      const c = cookie(req);
      c.role = input.role === 'employee' ? 'employee' : input.role === 'admin' ? 'admin' : 'ceo'; c.id = c.role === 'employee' ? 'DEMO001' : 'DEMOADMIN';
      const { state } = await store.read(); core.authorize(state, c); setCookie(req, res, c); return res.json({ data: core.snapshot(state, c) });
    }
    if (action === 'snapshot' || action === 'gameAccess') {
      if (actor.demo && action === 'gameAccess') core.fail('Demonstration accounts cannot authorize Unity game access.', 403);
      const { state } = await store.read(); const data = core.snapshot(state, actor);
      return res.json({ data: action === 'gameAccess' ? { employeeId: actor.id, assignments: data.assignments, scenario: data.scenario, authorized: true } : data });
    }
    if (action === 'installer') {
      const { state } = await store.read(); core.authorize(state, actor);
      if (actor.demo || !process.env.TRAINING_INSTALLER_PATH) core.fail('An approved employee training build has not been published yet.', 503);
      const token = process.env.TRAINING_INSTALLER_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
      await head(process.env.TRAINING_INSTALLER_PATH, { token });
      const signed = await issueSignedToken({ pathname: process.env.TRAINING_INSTALLER_PATH, operations: ['get'], validUntil: Date.now() + 60000, token });
      const download = await presignUrl(signed, { pathname: process.env.TRAINING_INSTALLER_PATH, operation: 'get', access: 'private', useCache: false });
      // One file, one minute, read-only. Avoid proxying a large game build through a function.
      return res.json({ data: { downloadUrl: download.presignedUrl, expiresInSeconds: 60 } });
    }
    if (action === 'provision') {
      const { state } = await store.read(); core.authorize(state, actor, true);
      core.text(input.name, 'Employee name'); core.text(input.group, 'Department/group');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email || '')) core.fail('Enter a valid registered email.');
      let account;
      if (actor.demo) account = { id: 'DEMO' + randomBytes(4).toString('hex').toUpperCase(), email: core.text(input.email, 'Email') };
      else if (input.createAccount) {
        if (!/^[A-Za-z0-9]{3,20}$/.test(input.username || '') || typeof input.password !== 'string' || input.password.length < 8) core.fail('New accounts require a 3–20 character alphanumeric username and a password of at least 8 characters.');
        const p = await playfab('RegisterPlayFabUser', { Email: core.text(input.email, 'Email', 254), Username: core.text(input.username, 'Username', 20), Password: input.password, RequireBothUsernameAndEmail: true });
        account = { id: p.PlayFabId.toUpperCase(), email: input.email };
      } else {
        const p = await playfab('GetAccountInfo', { PlayFabId: core.text(input.id, 'PlayFab ID', 100) }, actor.ticket);
        account = { id: p.AccountInfo.PlayFabId.toUpperCase(), email: input.email };
      }
      let employee;
      try { employee = await store.transaction(s => core.provision(s, actor, { ...input, ...account })); }
      catch (e) { if (input.createAccount && !actor.demo) core.fail(`Game account ${account.id} was created, but training access was not saved. Retry using Link existing account with this ID.`, 503); throw e; }
      return res.json({ data: employee });
    }
    if (actor.demo && ['sessionStart','attemptStart','events','heartbeat','sessionEnd'].includes(action)) core.fail('Demonstration sessions are fictional. Unity telemetry must use a real employee account.', 403);
    const operations = { setActive: core.setActive, editEmployee: core.editEmployee, setRole: core.setRole, assign: core.assign, rubric: core.configureRubric, feedback: core.feedback, sessionStart: core.startSession, attemptStart: core.startAttempt, events: core.ingest, heartbeat: core.heartbeat, sessionEnd: core.endSession };
    if (!operations[action]) core.fail('Unknown operation.');
    const data = await store.transaction(state => operations[action](state, actor, input)); return res.json({ data });
  } catch (e) {
    const status = e.status || 503;
    if (!e.status) console.error('Training service failure:', e.name, e.message);
    return res.status(status).json({ error: e.status ? e.message : 'Training storage is temporarily unavailable. Please retry.' });
  }
}
