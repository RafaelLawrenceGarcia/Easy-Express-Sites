import { createHash, randomUUID } from 'node:crypto';
import { authorize, fail, now, text } from './core.js';

const uuid = /^[a-f0-9]{32}$/i;
const types = new Set(['session_started', 'session_ended', 'level_started', 'level_resumed', 'level_passed', 'level_failed', 'job_accepted', 'job_submitted', 'job_returned', 'submission_blocked', 'boot_test', 'tutorial_completed']);
export const gameLevels = [
  'No display / boot loop', 'Custom PC builds', 'Loud fan noise', 'Blue screen of death', 'Slow performance',
  'Overheating', 'No power', 'Random shutdowns', 'Motherboard failure', 'Power supply overload',
].map((title, i) => ({ level: i + 1, title }));
export const gameplayDefinitions = [
  ['PCs built', 'Submitted Build jobs whose existing game evaluation found no unresolved issues. Tutorial practice and service-only returns are excluded.'],
  ['Unsuccessful submissions', 'Submitted Build jobs with unresolved issues, or Repair jobs whose existing quality report did not pass. Blocked submission clicks and unsuccessful boot tests are separate measurements.'],
  ['Level result', 'The game’s existing three-day level evaluation decides passed or failed. Reporting does not alter goals, grades or unlocks.'],
  ['Game quality', 'The existing game result, reported by the authenticated Unity client. This is not a server-graded thesis assessment or an anti-cheat score.'],
  ['Coverage', 'Activity received after tracking was installed. Earlier jobs cannot be reconstructed. Offline activity uploads when this same account reconnects. Multiplayer submission results describe the reporting host’s shared shop.'],
];

function integer(value, name, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) fail(`Invalid ${name}.`);
  return value;
}
function identifier(value, name, allowEmpty = false) {
  if (allowEmpty && !value) return '';
  if (typeof value !== 'string' || !uuid.test(value)) fail(`Invalid ${name}.`);
  return value.toLowerCase();
}
export function ingestGameplay(state, actor, input) {
  authorize(state, actor);
  if (actor.demo) fail('Real game reporting requires a real employee account.', 403);
  if (!Array.isArray(input.events) || !input.events.length || input.events.length > 50) fail('Submit 1–50 game events.');
  state.gameEvents ||= []; state.gameSessions ||= [];
  let accepted = 0;
  for (const event of input.events) {
    const id = identifier(event.id, 'event ID'), sessionId = identifier(event.sessionId, 'session ID');
    const hash = createHash('sha256').update(JSON.stringify(event)).digest('hex');
    const duplicate = state.gameEvents.find(e => e.employeeId === actor.id && e.id === id);
    if (duplicate) { if (duplicate.hash !== hash) fail('Game event ID reused with different content.', 409); continue; }
    if (!types.has(event.type)) fail('Unsupported game event.');
    const timestamp = Date.parse(event.timestamp);
    if (!Number.isFinite(timestamp) || timestamp > Date.now() + 300000 || timestamp < Date.now() - 30 * 86400000) fail('Game event timestamp must be within the last 30 days.');
    const level = integer(event.level, 'level', 0, 10), day = integer(event.day, 'day', 0, 100000);
    if (!['singleplayer', 'multiplayer', 'infinite', 'tutorial'].includes(event.mode)) fail('Invalid game mode.');
    if (!level && !['session_started', 'session_ended', 'tutorial_completed'].includes(event.type)) fail('This event requires a game level.');
    const normalized = { id, hash, employeeId: actor.id, sessionId, timestamp: new Date(timestamp).toISOString(), receivedAt: now(),
      type: event.type, level, day, mode: event.mode, runId: identifier(event.runId, 'level run ID', true),
      build: text(event.build, 'Game build', 100) };
    if (event.type.startsWith('level_') && !normalized.runId) fail('Level events require a run ID.');
    if (['job_accepted', 'job_submitted', 'job_returned', 'submission_blocked'].includes(event.type)) {
      normalized.jobId = identifier(event.jobId, 'job ID');
      if (!normalized.runId || !['build', 'repair'].includes(event.jobType)) fail('Jobs require a run and job type.');
      normalized.jobType = event.jobType;
    }
    if (event.type === 'job_submitted') {
      if (!['success', 'failed'].includes(event.outcome)) fail('Invalid submission outcome.');
      normalized.outcome = event.outcome;
      if (!Number.isFinite(event.score) || event.score < 0 || event.score > 100) fail('Invalid game quality score.');
      Object.assign(normalized, { score: event.score, stars: integer(event.stars, 'stars', 0, 5), issueCount: integer(event.issueCount, 'unresolved issues', 0, 1000), warranty: event.warranty === true });
    }
    if (event.type === 'boot_test') {
      if (!['success', 'failed'].includes(event.outcome)) fail('Invalid boot result.');
      normalized.outcome = event.outcome;
      normalized.detail = text(event.detail, 'Power result', 100);
    }
    if (event.type === 'tutorial_completed') {
      normalized.preScore = integer(event.preScore, 'pre-test score', -1, 10);
      normalized.postScore = integer(event.postScore, 'post-test score', -1, 10);
      if (!Number.isFinite(event.seconds) || event.seconds < 0 || event.seconds > 604800) fail('Invalid tutorial duration.');
      normalized.seconds = event.seconds;
    }
    // A persisted job may be loaded again or delivered by another session.
    // Keep one final outcome per employee, run and job instead of counting a retry twice.
    if (['job_submitted', 'job_returned'].includes(event.type)) {
      const prior = state.gameEvents.find(e => e.employeeId === actor.id && e.runId === normalized.runId && e.jobId === normalized.jobId && ['job_submitted', 'job_returned'].includes(e.type));
      if (prior) {
        if (prior.type !== normalized.type || prior.outcome !== normalized.outcome || prior.score !== normalized.score || prior.stars !== normalized.stars || prior.issueCount !== normalized.issueCount) fail('Job final outcome conflicts with the recorded result.', 409);
        continue;
      }
    }
    if (['level_passed', 'level_failed'].includes(event.type)) {
      const prior = state.gameEvents.find(e => e.employeeId === actor.id && e.runId === normalized.runId && ['level_passed', 'level_failed'].includes(e.type));
      if (prior) { if (prior.type !== normalized.type || prior.level !== normalized.level || prior.mode !== normalized.mode) fail('Level final outcome conflicts with the recorded result.', 409); continue; }
    }
    let session = state.gameSessions.find(s => s.employeeId === actor.id && s.id === sessionId);
    if (!session) { session = { id: sessionId, employeeId: actor.id, build: normalized.build, startedAt: normalized.timestamp, lastActivity: normalized.receivedAt, state: 'online' }; state.gameSessions.push(session); }
    if (session.build !== normalized.build) fail('Session build changed.', 409);
    session.startedAt = new Date(Math.min(Date.parse(session.startedAt), timestamp)).toISOString();
    session.lastActivity = normalized.receivedAt;
    if (event.type === 'session_ended') { session.state = 'ended'; session.endedAt = normalized.timestamp; }
    state.gameEvents.push(normalized); accepted++;
  }
  return { accepted, received: input.events.length };
}
export function gameplayHeartbeat(state, actor, input) {
  authorize(state, actor);
  if (actor.demo) fail('Real game reporting requires a real employee account.', 403);
  const id = identifier(input.sessionId, 'session ID');
  const session = (state.gameSessions || []).find(s => s.employeeId === actor.id && s.id === id);
  if (!session) fail('Game session not found.', 404);
  if (session.state === 'ended') fail('Game session has ended.', 409);
  session.lastActivity = now(); return { lastActivity: session.lastActivity };
}
export function gameplaySnapshot(state, actor) {
  const visible = e => actor.role !== 'employee' || e.employeeId === actor.id;
  return { gameEvents: (state.gameEvents || []).filter(visible), gameSessions: (state.gameSessions || []).filter(visible), gameLevels, gameplayDefinitions };
}
export function seedGameplayDemo(state) {
  if (state.gameEvents?.length) return;
  const ids = state.employees.filter(e => e.id.startsWith('DEMO') && e.id !== 'DEMOADMIN').map(e => e.id);
  const guid = () => randomUUID().replaceAll('-', '');
  state.gameEvents = []; state.gameSessions = [];
  ids.slice(0, 3).forEach((employeeId, i) => {
    const sessionId = guid(), runId = guid(), at = new Date(Date.now() - (i + 1) * 3600000).toISOString();
    state.gameSessions.push({ id: sessionId, employeeId, build: 'FICTIONAL-DEMO', startedAt: at, lastActivity: at, state: 'ended', endedAt: at });
    ['level_started', 'job_submitted', 'job_submitted', i === 1 ? 'level_failed' : 'level_passed'].forEach((type, n) => {
      state.gameEvents.push({ id: guid(), employeeId, sessionId, runId, timestamp: at, receivedAt: at, build: 'FICTIONAL-DEMO', level: i + 1, day: n === 3 ? 3 : 1, mode: 'singleplayer', type,
        ...(type === 'job_submitted' ? { jobId: guid(), jobType: n === 1 ? 'build' : 'repair', outcome: i === 1 && n === 1 ? 'failed' : 'success', score: i === 1 && n === 1 ? 40 : 90, stars: i === 1 && n === 1 ? 2 : 4, issueCount: i === 1 && n === 1 ? 2 : 0, warranty: false } : {}) });
    });
  });
}
