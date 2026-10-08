import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomBytes } from 'node:crypto';
import handler from '../api/training.js';
import { Store } from '../server/store.js';
import * as core from '../server/core.js';

test('registration waits for approval, protects training and resumes after an administrator accepts', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ee-requests-'));
  const keys = ['TRAINING_LOCAL_DIR', 'TRAINING_DATA_KEY', 'EASY_EXPRESS_CEO_PLAYFAB_ID', 'VERCEL'];
  const previous = Object.fromEntries(keys.map(k => [k, process.env[k]])), originalFetch = globalThis.fetch;
  process.env.TRAINING_LOCAL_DIR = dir; process.env.TRAINING_DATA_KEY = randomBytes(32).toString('hex'); process.env.EASY_EXPRESS_CEO_PLAYFAB_ID = 'CEO'; delete process.env.VERCEL;
  const accounts = { 'ceo-session-ticket': { id: 'CEO', email: 'ceo@example.invalid' }, 'applicant-session-ticket': { id: 'NEWPLAYER', email: 'new@example.invalid' } };
  let registeredPassword, registrationConflict = false;
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    let data;
    if (String(url).endsWith('RegisterPlayFabUser')) {
      if (registrationConflict) return new Response(JSON.stringify({ code: 400, error: 'EmailAddressNotAvailable', errorMessage: 'Email address not available' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      registeredPassword = body.Password; data = { PlayFabId: 'NEWPLAYER', SessionTicket: 'applicant-session-ticket' };
    }
    else if (String(url).endsWith('LoginWithEmailAddress')) data = { SessionTicket: body.Email === 'ceo@example.invalid' ? 'ceo-session-ticket' : 'applicant-session-ticket' };
    else { const a = accounts[options.headers['X-Authorization']]; data = { AccountInfo: { PlayFabId: a.id, Username: 'Applicant', PrivateInfo: { Email: a.email } } }; }
    return new Response(JSON.stringify({ code: 200, data }), { headers: { 'Content-Type': 'application/json' } });
  };
  const call = async (action, input = {}, cookie = '', bearer = '') => {
    const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.statusCode = n; return this; }, json(p) { this.body = p; return this; } };
    await handler({ method: 'POST', headers: { host: 'localhost', origin: 'http://localhost', cookie, ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) }, body: { action, ...input } }, res);
    return res;
  };
  try {
    const owner = await call('login', { email: 'ceo@example.invalid', password: 'fixture-password' }), ownerCookie = owner.headers['Set-Cookie'].split(';')[0];
    registrationConflict = true;
    const conflict = await call('register', { email: 'reserved@example.invalid', username: 'Reserved', password: 'fixture-password', name: 'Applicant', group: 'IT', role: 'ceo' });
    assert.equal(conflict.statusCode, 409); assert.match(conflict.body.error, /existing PlayFab login/); assert.equal(conflict.headers['Set-Cookie'], undefined);
    const beforeRegistration = (await new Store().read()).state; assert.equal(beforeRegistration.employees.length, 1); assert.equal((beforeRegistration.accessRequests || []).length, 0);
    registrationConflict = false;
    let response = await call('register', { email: 'new@example.invalid', username: 'NewPlayer', password: '  fixture-password  ', name: 'New applicant', group: 'Requested team', role: 'ceo', active: true, id: 'CEO' });
    const applicantCookie = response.headers['Set-Cookie'].split(';')[0], requestId = response.body.data.request.id;
    assert.equal(response.statusCode, 200); assert.equal(response.body.data.accessStatus, 'pending'); assert.equal(response.body.data.me.id, 'NEWPLAYER'); assert.equal(registeredPassword, '  fixture-password  ');
    assert.equal(response.body.data.employees, undefined);
    for (const action of ['gameAccess', 'sessionStart', 'attemptStart', 'events', 'installer', 'reviewAccessRequest']) assert.equal((await call(action, { requestId, decision: 'approved', group: 'IT' }, applicantCookie)).statusCode, 403, action);
    assert.equal((await call('gameAccess', {}, '', 'applicant-session-ticket')).statusCode, 403);
    response = await call('requestAccess', { name: 'Changed', group: 'Changed', id: 'CEO', role: 'admin' }, applicantCookie);
    assert.equal(response.body.data.request.id, requestId); assert.equal(response.body.data.request.playerId, 'NEWPLAYER');
    response = await call('snapshot', {}, ownerCookie); assert.equal(response.body.data.accessRequests.length, 1); assert.equal(response.body.data.employees.length, 1);
    await new Store().transaction(s => { core.provision(s, { id: 'CEO', role: 'ceo' }, { id: 'ADMIN', name: 'Administrator', email: 'admin@example.invalid', group: 'IT' }); core.setRole(s, { id: 'CEO', role: 'ceo' }, { id: 'ADMIN', role: 'admin' }); });
    accounts['admin-session-ticket'] = { id: 'ADMIN', email: 'admin@example.invalid' };
    response = await call('reviewAccessRequest', { requestId, decision: 'approved', name: 'Approved employee', group: 'IT', role: 'admin' }, '', 'admin-session-ticket'); assert.equal(response.statusCode, 200);
    assert.equal((await call('reviewAccessRequest', { requestId, decision: 'approved', group: 'IT' }, ownerCookie)).statusCode, 200);
    response = await call('snapshot', {}, applicantCookie); assert.equal(response.body.data.me.role, 'employee'); assert.equal(response.body.data.me.group, 'IT'); assert.deepEqual(response.body.data.accessRequests, []); assert.equal(response.body.data.employees.length, 1);
    assert.equal((await call('gameAccess', {}, '', 'applicant-session-ticket')).statusCode, 200);
    const { state } = await new Store().read(); assert.equal(state.employees.filter(e => e.id === 'NEWPLAYER').length, 1); assert.equal(JSON.stringify(state).includes('fixture-password'), false);
    await call('setActive', { id: 'NEWPLAYER', active: false }, ownerCookie);
    assert.equal((await call('snapshot', {}, applicantCookie)).body.data.accessStatus, 'inactive');
    assert.equal((await call('requestAccess', { name: 'New applicant', group: 'IT' }, applicantCookie)).statusCode, 409);
    assert.equal((await call('gameAccess', {}, '', 'applicant-session-ticket')).statusCode, 403);
  } finally { globalThis.fetch = originalFetch; for (const k of keys) { if (previous[k] === undefined) delete process.env[k]; else process.env[k] = previous[k]; } await rm(dir, { recursive: true, force: true }); }
});

test('rejection is scoped, audited and can be resubmitted without creating an employee', () => {
  const s = { employees: [{ id: 'CEO', active: true }], assignments: [], attempts: [], sessions: [], audit: [], rubric: {} };
  const applicant = { id: 'NEW', name: 'Applicant', email: 'a@example.invalid', role: 'employee' }, ceo = { id: 'CEO', role: 'ceo' };
  const request = core.requestAccess(s, applicant, { name: 'Applicant', group: 'IT', role: 'admin' });
  assert.throws(() => core.reviewAccessRequest(s, applicant, { requestId: request.id, decision: 'approved', group: 'IT' }), /inactive|provisioned/);
  core.reviewAccessRequest(s, ceo, { requestId: request.id, decision: 'rejected', reason: 'Confirm your department with the training team.' });
  assert.equal(core.accessStatus(s, applicant).request.reason, 'Confirm your department with the training team.');
  assert.equal(core.accessStatus(s, { id: 'OTHER' }).request, null); assert.equal(s.employees.length, 1);
  core.requestAccess(s, applicant, { name: 'Applicant', group: 'Technical services' }); assert.equal(s.accessRequests.length, 1); assert.equal(request.status, 'pending'); assert.equal(request.reason, '');
  assert.ok(s.audit.some(a => a.operation === 'access.rejected'));
  assert.throws(() => core.requestAccess(s, { ...applicant, demo: true }, { name: 'Applicant', group: 'IT' }), /real game account/);
});
