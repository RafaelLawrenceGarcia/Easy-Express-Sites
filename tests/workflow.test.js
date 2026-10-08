import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as core from '../server/core.js';
import { questions } from '../server/catalog.js';
import { Store, seal, unseal } from '../server/store.js';

const ceo = { id: 'CEO', role: 'ceo' }, employee = { id: 'EMP1', role: 'employee' };
function state() { return { schema: 1, employees: [{ id: 'CEO', role: 'ceo', name: 'CEO', active: true }], assignments: [], sessions: [], attempts: [], audit: [], rubric: { version: 'components-1', passPercent: 80, questionCount: 10 } }; }
function setup() {
  const s = state(); core.provision(s, ceo, { id: 'EMP1', name: 'Employee', email: 'e@example.invalid', group: 'IT' });
  const a = core.assign(s, ceo, { employeeId: 'EMP1', dueDate: '2026-10-31', attemptLimit: 3 })[0];
  const session = core.startSession(s, employee, { requestId: 'session-1', gameBuild: 'test-build' });
  return { s, a, session };
}
function begin(s, session, assignmentId, requestId = randomUUID()) { return core.startAttempt(s, employee, { sessionId: session.id, requestId, assignmentId, scenarioId: 'pc-components', scenarioVersion: '1' }); }
function events(score = 9) { return [...Object.entries(questions).map(([questionId,q], i) => ({ id: randomUUID(), type: 'answer', timestamp: core.now(), phase: 'post', questionId, ...(q.category ? { selectedCategory: i < score ? q.category : 'CPU' } : { selectedIndex: i < score ? 0 : 1 }) })), { id: randomUUID(), type: 'completed', timestamp: core.now(), phase: 'post', tutorialSeconds: 120 }]; }

test('provision → assign → telemetry → result → feedback is scoped to the employee', () => {
  const { s, a, session } = setup(), attempt = begin(s, session, a.id), input = { attemptId: attempt.id, events: events(9) };
  core.ingest(s, employee, input); core.feedback(s, ceo, { attemptId: attempt.id, text: 'Review PSU identification.' });
  const view = core.snapshot(s, employee);
  assert.equal(view.attempts[0].score, 90); assert.equal(view.attempts[0].result, 'passed');
  assert.equal(view.attempts[0].feedback[0].text, 'Review PSU identification.'); assert.equal(view.employees.length, 1);
  assert.equal(view.assignments[0].employeeId, 'EMP1'); assert.equal(view.attempts[0].events.length, 11);
});
test('session start, attempt start and event retries are idempotent; altered event IDs fail', () => {
  const { s,a,session } = setup(), attempt = begin(s,session,a.id,'attempt-1');
  assert.equal(begin(s,session,a.id,'attempt-1').id,attempt.id);
  assert.equal(core.startSession(s,employee,{requestId:'session-1',gameBuild:'test-build'}).id,session.id);
  assert.throws(()=>core.startSession(s,employee,{requestId:'session-1',gameBuild:'different-build'}),/different content/);
  assert.throws(()=>begin(s,session,null,'attempt-1'),/different content/);
  const input = { attemptId:attempt.id,events:events() }; core.ingest(s,employee,input); core.ingest(s,employee,input);
  assert.equal(s.attempts.length,1); assert.equal(attempt.events.length,11);
  assert.throws(()=>core.ingest(s,employee,{attemptId:attempt.id,events:[{...input.events[0],phase:'pre'}]}),/different content/);
});
test('employees cannot provision, grant roles, write feedback or access another employee attempt', () => {
  const {s,a,session}=setup();const attempt=begin(s,session,a.id);
  for(const operation of [()=>core.provision(s,employee,{}),()=>core.setRole(s,employee,{}),()=>core.feedback(s,employee,{})])assert.throws(operation,/Administrator/);
  const other={id:'EMP2',role:'employee'};core.provision(s,ceo,{id:'EMP2',name:'Other',email:'o@example.invalid',group:'IT'});
  assert.equal(core.snapshot(s,other).attempts.length,0);assert.equal(core.snapshot(s,other).assignments.length,0);
  assert.throws(()=>core.ingest(s,other,{attemptId:attempt.id,events:events()}),/does not belong/);
  assert.throws(()=>core.startAttempt(s,other,{sessionId:session.id,requestId:'bad',scenarioId:'pc-components',scenarioVersion:'1',assignmentId:a.id}),/does not belong/);
});
test('only CEO can grant admins and deactivate administrators; deactivated employees cannot report or start',()=>{
  const {s,session}=setup();core.setRole(s,ceo,{id:'EMP1',role:'admin'});
  assert.equal(s.employees.find(e=>e.id==='EMP1').role,'admin');
  assert.throws(()=>core.setRole(s,{id:'EMP1',role:'admin'},{id:'CEO',role:'employee'}),/Only the CEO/);
  assert.throws(()=>core.setActive(s,{id:'EMP1',role:'admin'},{id:'CEO',active:false}),/CEO access is protected/);
  core.provision(s,ceo,{id:'EMP2',name:'Second',email:'second@example.invalid',group:'IT'});
  core.setRole(s,ceo,{id:'EMP2',role:'admin'});
  assert.throws(()=>core.setActive(s,{id:'EMP1',role:'admin'},{id:'EMP2',active:false}),/Only the CEO/);
  core.setActive(s,ceo,{id:'EMP1',active:false});
  assert.throws(()=>core.startSession(s,employee,{requestId:'new',gameBuild:'test'}),/inactive/);
  assert.throws(()=>core.heartbeat(s,employee,{sessionId:session.id}),/inactive/);
});
test('practice never completes an assignment; pass mark changes preserve assignment history',()=>{
  const {s,a,session}=setup();core.configureRubric(s,ceo,{passPercent:100});
  const practice=begin(s,session,null);core.ingest(s,employee,{attemptId:practice.id,events:events()});
  assert.equal(practice.assignmentId,null);assert.equal(practice.rubric.passPercent,100);assert.equal(a.rubric.passPercent,80);
  const assigned=begin(s,session,a.id);core.ingest(s,employee,{attemptId:assigned.id,events:events()});
  assert.equal(assigned.result,'passed');assert.equal(practice.result,'needs_another_attempt');
});
test('final scores are computed from answer inputs, incomplete or duplicate questions fail',()=>{
  const {s,a,session}=setup();const attempt=begin(s,session,a.id);const list=events();
  assert.throws(()=>core.ingest(s,employee,{attemptId:attempt.id,events:[list.at(-1)]}),/all ten/);
  core.ingest(s,employee,{attemptId:attempt.id,events:[list[0]]});
  assert.throws(()=>core.ingest(s,employee,{attemptId:attempt.id,events:[{...list[0],id:randomUUID()}]}),/First answer/);
  core.ingest(s,employee,{attemptId:attempt.id,events:list.slice(1).map(e=>({...e,score:100}))});assert.equal(attempt.score,90);
  assert.throws(()=>core.startAttempt(s,employee,{sessionId:session.id,requestId:'new',assignmentId:a.id,scenarioId:'pc-components',scenarioVersion:'1'}),/already passed/);
});
test('durable local backend encrypts records and serializes concurrent writes',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'ee-training-'));
  process.env.TRAINING_LOCAL_DIR=dir;process.env.TRAINING_DATA_KEY=randomBytes(32).toString('hex');
  try{const store=new Store();await Promise.all(Array.from({length:20},(_,i)=>store.transaction(s=>s.audit.push({id:i}))));
  const result=await new Store().read();assert.equal(result.state.audit.length,20);
  const file=await readFile(path.join(dir,'production.enc'),'utf8');assert.equal(file.includes('audit'),false);assert.deepEqual(unseal(seal({private:'employee'})),{private:'employee'});
  assert.throws(()=>unseal(file.slice(0,-10)+'bad'));}finally{delete process.env.TRAINING_LOCAL_DIR;await rm(dir,{recursive:true,force:true});}
});
test('demo seed is explicitly fictional and retains isolation by namespace',()=>{
  const s=state();s.employees=[];core.seedDemo(s);assert.equal(s.employees.length,4);
  assert.ok(s.employees.every(e=>e.email.endsWith('example.invalid')));assert.equal(s.attempts.length,2);
  assert.throws(()=>new Store('demo-invalid'));core.seedDemo(s);assert.equal(s.attempts.length,2);
});
