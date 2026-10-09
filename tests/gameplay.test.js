import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ingestGameplay, gameplayHeartbeat } from '../server/gameplay.js';
import { snapshot } from '../server/core.js';
const id = () => randomUUID().replaceAll('-', '');
const employee = { id: 'PLAYER', role: 'employee' }, admin = { id: 'ADMIN', role: 'admin' };
const state = () => ({ employees: [{ id: 'PLAYER', active: true }, { id: 'ADMIN', active: true }], assignments: [], attempts: [], sessions: [], audit: [] });
const base = () => ({ id: id(), sessionId: id(), runId: id(), level: 2, day: 4, mode: 'singleplayer', timestamp: new Date().toISOString(), build: 'EasyExpress4/test' });

test('game activity belongs to authenticated player, retries do not inflate builds and levels', () => {
  const s = state(), b = base(), job = { ...b, type: 'job_submitted', jobId: id(), jobType: 'build', outcome: 'success', score: 100, stars: 5, issueCount: 0, employeeId: 'ADMIN' };
  assert.equal(ingestGameplay(s, employee, { events: [job] }).accepted, 1);
  assert.equal(s.gameEvents[0].employeeId, 'PLAYER');
  assert.equal(ingestGameplay(s, employee, { events: [job] }).accepted, 0);
  assert.equal(ingestGameplay(s, employee, { events: [{ ...job, id: id(), sessionId: id() }] }).accepted, 0);
  assert.throws(() => ingestGameplay(s, employee, { events: [{ ...job, score: 50 }] }), /reused/);
  assert.throws(() => ingestGameplay(s, employee, { events: [{ ...job, id: id(), outcome: 'failed' }] }), /conflicts/);
  const passed = { ...b, id: id(), type: 'level_passed' };
  ingestGameplay(s, employee, { events: [passed] });
  assert.equal(ingestGameplay(s, employee, { events: [{ ...passed, id: id() }] }).accepted, 0);
  assert.throws(() => ingestGameplay(s, employee, { events: [{ ...passed, id: id(), type: 'level_failed' }] }), /conflicts/);
  assert.equal(snapshot(s, employee).gameEvents.length, 2);
  assert.equal(snapshot(s, admin).gameEvents.length, 2);
  assert.equal(snapshot(s, { id: 'ADMIN', role: 'employee' }).gameEvents.length, 0);
  assert.throws(() => gameplayHeartbeat(s, admin, { sessionId: b.sessionId }), /not found/);
});
test('failed builds, blocked submissions and failed boot checks remain different records', () => {
  const s = state(), b = base();
  const events = [
    { ...b, id: id(), type: 'job_submitted', jobId: id(), jobType: 'build', outcome: 'failed', score: 40, stars: 2, issueCount: 3 },
    { ...b, id: id(), type: 'submission_blocked', jobId: id(), jobType: 'repair' },
    { ...b, id: id(), type: 'boot_test', outcome: 'failed', detail: 'NoPower' },
    { ...b, id: id(), type: 'job_returned', jobId: id(), jobType: 'repair' },
  ];
  ingestGameplay(s, employee, { events });
  assert.equal(s.gameEvents.filter(e => e.type === 'job_submitted' && e.outcome === 'failed').length, 1);
  assert.equal(s.gameEvents.filter(e => e.type === 'boot_test').length, 1);
  assert.equal(s.gameEvents.filter(e => e.type === 'job_returned').length, 1);
  s.employees[0].active = false;
  assert.throws(() => ingestGameplay(s, employee, { events }), /inactive/);
});
test('delayed events retain timestamps and ended sessions; invalid and demo input is denied', () => {
  const s = state(), b = base();
  ingestGameplay(s, employee, { events: [{ ...b, type: 'session_ended', level: 0, runId: '' }] });
  const earlier = new Date(Date.now() - 3600000).toISOString();
  ingestGameplay(s, employee, { events: [{ ...b, id: id(), type: 'level_started', timestamp: earlier }] });
  assert.equal(s.gameSessions[0].state, 'ended'); assert.equal(s.gameEvents[1].timestamp, earlier);
  assert.throws(() => gameplayHeartbeat(s, employee, { sessionId: b.sessionId }), /ended/);
  assert.throws(() => ingestGameplay(state(), { ...employee, demo: true }, { events: [{ ...b, type: 'level_started' }] }), /real employee/);
  for (const patch of [{ level: 11 }, { score: NaN }, { stars: 7 }, { timestamp: 'bad' }, { jobType: 'customer_email' }]) {
    assert.throws(() => ingestGameplay(state(), employee, { events: [{ ...b, type: 'job_submitted', jobId: id(), jobType: 'build', outcome: 'success', score: 90, stars: 4, issueCount: 0, ...patch }] }));
  }
});
