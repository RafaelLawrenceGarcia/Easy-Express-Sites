import { randomUUID, createHash } from 'node:crypto';
import { questions, rubric, scenario, metricDefinitions } from './catalog.js';

export function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }
export const now = () => new Date().toISOString();
export function text(value, label, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`${label} is required (maximum ${max} characters).`);
  return value.trim();
}
export function authorize(state, actor, admin = false) {
  const employee = state.employees.find(e => e.id === actor.id);
  if (!employee?.active) fail('Employee access is inactive or has not been provisioned.', 403);
  if (admin && !['admin', 'ceo'].includes(actor.role)) fail('Administrator access is required.', 403);
  return employee;
}
export function audit(state, actor, operation, target) {
  state.audit.push({ id: randomUUID(), actor: actor.id, operation, target, at: now() });
}
export function provision(state, actor, input) {
  authorize(state, actor, true);
  const id = text(input.id, 'PlayFab ID', 100).toUpperCase();
  if (state.employees.some(e => e.id === id)) fail('This account is already provisioned.', 409);
  const employee = { id, name: text(input.name, 'Name'), email: text(input.email, 'Email'), group: text(input.group, 'Department/group'), active: true, createdAt: now() };
  state.employees.push(employee); audit(state, actor, 'employee.provisioned', id); return employee;
}
export function setActive(state, actor, input) {
  authorize(state, actor, true);
  if (input.id === actor.id) fail('You cannot deactivate your own administrator access.');
  const e = state.employees.find(e => e.id === input.id);
  if (!e || typeof input.active !== 'boolean') fail('Unknown employee or invalid status.');
  if (e.role === 'ceo') fail('CEO access is protected by server configuration.', 403);
  if (e.role === 'admin' && actor.role !== 'ceo') fail('Only the CEO can deactivate an administrator.', 403);
  e.active = input.active; audit(state, actor, input.active ? 'employee.activated' : 'employee.deactivated', e.id);
  return e;
}
export function editEmployee(state, actor, input) {
  authorize(state, actor, true);
  const e = state.employees.find(e => e.id === input.id);
  if (!e) fail('Employee not found.');
  if (e.role === 'ceo' && actor.role !== 'ceo') fail('Only the CEO can edit the CEO profile.', 403);
  e.name = text(input.name, 'Employee name'); e.group = text(input.group, 'Department / group');
  audit(state, actor, 'employee.updated', e.id); return e;
}
export function setRole(state, actor, input) {
  authorize(state, actor, true);
  if (actor.role !== 'ceo') fail('Only the CEO can manage administrator access.', 403);
  if (input.id === actor.id) fail('The CEO role is protected by server configuration.');
  const e = state.employees.find(e => e.id === input.id);
  if (!e || !e.active || !['employee', 'admin'].includes(input.role)) fail('Choose an active employee and a supported role.');
  e.role = input.role; audit(state, actor, 'role.changed', e.id + ':' + e.role); return e;
}
export function assign(state, actor, input) {
  authorize(state, actor, true);
  const due = text(input.dueDate, 'Due date');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || !Number.isFinite(Date.parse(due))) fail('Choose a valid due date.');
  const limits = Number(input.attemptLimit);
  if (!Number.isInteger(limits) || limits < 1 || limits > 20) fail('Attempt limit must be 1–20.');
  const employees = state.employees.filter(e => e.active && (input.group ? e.group === input.group : e.id === input.employeeId));
  if (!employees.length) fail('Select an active employee or a group with active employees.');
  const assignments = employees.map(e => ({ id: randomUUID(), employeeId: e.id, scenarioId: scenario.id, scenarioVersion: scenario.version,
    title: scenario.title, dueDate: due, attemptLimit: limits, rubric: { ...state.rubric }, createdAt: now(), createdBy: actor.id }));
  state.assignments.push(...assignments); audit(state, actor, 'training.assigned', assignments.map(a => a.id).join(',')); return assignments;
}
export function configureRubric(state, actor, input) {
  authorize(state, actor, true);
  const percent = Number(input.passPercent);
  if (!Number.isInteger(percent) || percent < 10 || percent > 100 || percent % 10 !== 0) fail('Pass mark must be a multiple of ten between 10 and 100.');
  state.rubric = { ...rubric, version: `components-${randomUUID()}`, passPercent: percent };
  audit(state, actor, 'rubric.changed', state.rubric.version); return state.rubric;
}
function sessionFor(state, actor, id) {
  const s = state.sessions.find(s => s.id === id);
  if (!s || s.employeeId !== actor.id) fail('Session does not belong to this employee.', 403);
  return s;
}
export function startSession(state, actor, input) {
  authorize(state, actor);
  const requestId = text(input.requestId, 'Request ID', 100);
  const previous = state.sessions.find(s => s.employeeId === actor.id && s.requestId === requestId);
  if (previous) { if(previous.build !== input.gameBuild) fail('Session request ID reused with different content.',409); return previous; }
  const session = { id: randomUUID(), requestId, employeeId: actor.id, build: text(input.gameBuild, 'Game build', 100), state: 'online', startedAt: now(), lastActivity: now() };
  state.sessions.push(session); audit(state, actor, 'session.started', session.id); return session;
}
export function heartbeat(state, actor, input) {
  authorize(state, actor);
  const s = sessionFor(state, actor, input.sessionId);
  if (s.state === 'ended') fail('Session has ended.', 409);
  s.lastActivity = now(); return { lastActivity: s.lastActivity };
}
export function startAttempt(state, actor, input) {
  authorize(state, actor);
  const s = sessionFor(state, actor, input.sessionId);
  if (s.state === 'ended') fail('Session has ended.', 409);
  const requestId = text(input.requestId, 'Attempt request ID', 100);
  const previous = state.attempts.find(a => a.employeeId === actor.id && a.requestId === requestId);
  if (previous) {
    if (previous.sessionId !== s.id || previous.assignmentId !== (input.assignmentId || null) || previous.scenarioId !== input.scenarioId || previous.scenarioVersion !== input.scenarioVersion) fail('Attempt request ID reused with different content.', 409);
    return previous;
  }
  if (input.scenarioId !== scenario.id || input.scenarioVersion !== scenario.version) fail('Unsupported scenario version.');
  const assignment = input.assignmentId ? state.assignments.find(a => a.id === input.assignmentId && a.employeeId === actor.id) : null;
  if (input.assignmentId && !assignment) fail('Assignment does not belong to this employee.', 403);
  if (assignment) {
    if (state.attempts.filter(a => a.assignmentId === assignment.id).length >= assignment.attemptLimit) fail('Attempt limit reached.', 409);
    if (state.attempts.some(a => a.assignmentId === assignment.id && a.result === 'passed')) fail('This assignment has already passed.', 409);
  }
  if (state.attempts.some(a => a.sessionId === s.id && a.state === 'in_progress')) fail('Finish or abandon the current attempt first.', 409);
  const clientStartedAt = input.clientStartedAt || now();
  if (!Number.isFinite(Date.parse(clientStartedAt)) || Date.parse(clientStartedAt) > Date.now() + 300000 || Date.parse(clientStartedAt) < Date.now() - 7 * 86400000) fail('Invalid client attempt timestamp.');
  const attempt = { id: randomUUID(), requestId, employeeId: actor.id, sessionId: s.id, assignmentId: assignment?.id || null,
    mode: assignment ? 'assessment' : 'practice', scenarioId: scenario.id, scenarioVersion: scenario.version, rubric: { ...(assignment?.rubric || state.rubric) },
    build: s.build, state: 'in_progress', startedAt: now(), clientStartedAt, finishedAt: null, events: [], result: null, score: null, tutorialSeconds: null, feedback: [] };
  state.attempts.push(attempt); s.lastActivity = now(); s.scenarioId = scenario.id; audit(state, actor, 'scenario.started', attempt.id); return attempt;
}
export function ingest(state, actor, input) {
  authorize(state, actor);
  const attempt = state.attempts.find(a => a.id === input.attemptId && a.employeeId === actor.id);
  if (!attempt) fail('Attempt does not belong to this employee.', 403);
  const session = sessionFor(state, actor, attempt.sessionId);
  if (!Array.isArray(input.events) || !input.events.length || input.events.length > 100) fail('Submit 1–100 events.');
  for (const event of input.events) {
    const id = text(event.id, 'Event ID', 100), hash = createHash('sha256').update(JSON.stringify(event)).digest('hex');
    const existing = state.attempts.flatMap(a => a.events).find(e => e.id === id);
    if (existing) { if (existing.hash !== hash || existing.attemptId !== attempt.id) fail('Event ID reused with different content.', 409); continue; }
    if (attempt.state !== 'in_progress' || session.state === 'ended') fail('Attempt or session has ended.', 409);
    const timestamp = Date.parse(event.timestamp);
    if (!Number.isFinite(timestamp) || timestamp > Date.now() + 300_000 || timestamp < Date.parse(attempt.clientStartedAt || attempt.startedAt) - 300_000) fail('Invalid event timestamp.');
    const normalized = { id, hash, attemptId: attempt.id, timestamp: event.timestamp, receivedAt: now(), type: event.type };
    if (event.type === 'answer') {
      if (!['pre', 'post', 'replay'].includes(event.phase)) fail('Unsupported assessment phase.');
      const q = questions[event.questionId];
      if (!q) fail('Unknown knowledge question.');
      if (attempt.events.some(e => e.type === 'answer' && e.phase === event.phase && e.questionId === event.questionId)) fail('First answer already recorded for this question.', 409);
      if (q.category ? typeof event.selectedCategory !== 'string' || event.selectedCategory.length > 60 : !Number.isInteger(event.selectedIndex) || event.selectedIndex < 0 || event.selectedIndex > 2) fail('Invalid answer input.');
      Object.assign(normalized, { phase: event.phase, questionId: event.questionId, selectedIndex: event.selectedIndex ?? null, selectedCategory: event.selectedCategory ?? null,
        correct: q.category ? event.selectedCategory.toLowerCase() === q.category.toLowerCase() : event.selectedIndex === q.answer, skill: q.skill });
    } else if (['completed', 'failed', 'abandoned'].includes(event.type)) {
      if (event.type !== 'abandoned') {
        if (!['pre', 'post', 'replay'].includes(event.phase)) fail('Select the completed check phase.');
        const answers = attempt.events.filter(e => e.type === 'answer' && e.phase === event.phase);
        if (answers.length !== 10) fail('A finalized assessment needs all ten first answers.', 409);
        const correct = answers.filter(a => a.correct).length;
        attempt.score = correct * 10; attempt.correct = correct; attempt.phase = event.phase;
        attempt.result = attempt.score >= attempt.rubric.passPercent ? 'passed' : 'needs_another_attempt';
      } else attempt.result = 'abandoned';
      if (event.tutorialSeconds != null) {
        if (!Number.isFinite(event.tutorialSeconds) || event.tutorialSeconds < 0 || event.tutorialSeconds > 604800) fail('Invalid tutorial time.');
        attempt.tutorialSeconds = event.tutorialSeconds;
      }
      attempt.state = 'submitted'; attempt.finishedAt = now();
      Object.assign(normalized, { phase: event.phase || null, result: attempt.result, score: attempt.score });
    } else fail('Unsupported event type.');
    attempt.events.push(normalized); session.lastActivity = now();
  }
  return { attemptId: attempt.id, state: attempt.state, result: attempt.result, score: attempt.score };
}
export function endSession(state, actor, input) {
  authorize(state, actor); const s = sessionFor(state, actor, input.sessionId);
  if (state.attempts.some(a => a.sessionId === s.id && a.state === 'in_progress')) fail('Abandon or complete the open attempt before ending the session.', 409);
  s.state = 'ended'; s.endedAt = s.endedAt || now(); s.lastActivity = now(); return s;
}
export function feedback(state, actor, input) {
  authorize(state, actor, true);
  const a = state.attempts.find(a => a.id === input.attemptId);
  if (!a || a.state !== 'submitted') fail('Select a finalized attempt.');
  const entry = { id: randomUUID(), author: actor.id, text: text(input.text, 'Feedback', 2000), at: now() };
  a.feedback.push(entry); audit(state, actor, 'feedback.added', a.id); return entry;
}
export function snapshot(state, actor) {
  const me = authorize(state, actor), visible = e => actor.role !== 'employee' || e.employeeId === actor.id;
  return { me: { ...me, role: actor.role }, demo: actor.demo, scenario, metricDefinitions, rubric: state.rubric,
    employees: actor.role !== 'employee' ? state.employees : [me], assignments: state.assignments.filter(visible), attempts: state.attempts.filter(visible), sessions: state.sessions.filter(visible),
    updatedAt: now(), installerAvailable: Boolean(process.env.TRAINING_INSTALLER_PATH), gameIntegration: 'Game source connected; deployment and signed-in end-to-end verification required.' };
}
export function seedDemo(state) {
  if (state.employees.length) return;
  state.employees = [
    { id: 'DEMOADMIN', name: 'Alex Morgan', email: 'alex@example.invalid', group: 'Training team', active: true },
    { id: 'DEMO001', name: 'Jamie Rivera', email: 'jamie@example.invalid', group: 'Technical services', active: true },
    { id: 'DEMO002', name: 'Sam Chen', email: 'sam@example.invalid', group: 'Technical services', active: true },
    { id: 'DEMO003', name: 'Taylor Brooks', email: 'taylor@example.invalid', group: 'Customer support', active: true },
  ];
  const admin = { id: 'DEMOADMIN', role: 'admin', demo: true };
  const dueDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  for (const id of ['DEMO001','DEMO002','DEMO003']) assign(state, admin, { employeeId: id, dueDate, attemptLimit: 3 });
  for (const [id, score] of [['DEMO001', 9], ['DEMO002', 6]]) {
    const actor = { id, role: 'employee', demo: true }, s = startSession(state, actor, { requestId: randomUUID(), gameBuild: 'Fictional sample build' });
    const a = startAttempt(state, actor, { sessionId: s.id, requestId: randomUUID(), assignmentId: state.assignments.find(a => a.employeeId === id).id, scenarioId: scenario.id, scenarioVersion: '1' });
    const events = Object.entries(questions).map(([questionId, q], i) => ({ id: randomUUID(), type: 'answer', timestamp: now(), phase: 'post', questionId, ...(q.category ? { selectedCategory: i < score ? q.category : 'Unknown' } : { selectedIndex: i < score ? q.answer : 1 }) }));
    events.push({ id: randomUUID(), type: 'completed', phase: 'post', timestamp: now(), tutorialSeconds: id === 'DEMO001' ? 1140 : 1560 });
    ingest(state, actor, { attemptId: a.id, events }); endSession(state, actor, { sessionId: s.id });
    feedback(state, admin, { attemptId: a.id, text: id === 'DEMO001' ? 'Good progress. Review power supply identification before your next practice check.' : 'Revisit component identification and safe handling, then take another attempt.' });
  }
}
