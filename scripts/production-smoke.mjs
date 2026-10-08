const base = process.env.TRAINING_SMOKE_URL || 'https://easy-express-sites-izwi.vercel.app';
let cookie = '';
async function request(action, input = {}, expected = 200, headers = {}) {
  const r = await fetch(base + '/api/training', { method: 'POST', headers: { 'Content-Type':'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: JSON.stringify({ action, ...input }) });
  const p = await r.json().catch(()=>({}));
  if (r.status !== expected) throw new Error(`${action}: expected ${expected}, received ${r.status}: ${p.error || 'unknown error'}`);
  const set = r.headers.get('set-cookie'); if(set)cookie=set.split(';')[0]; return p.data || p;
}
await request('snapshot', { employeeId:'ACD5808EE029F206', role:'ceo' }, 401);
await request('demo', {}, 403, { Origin:'https://unauthorized.example.invalid' });
let d = await request('demo');
if(!d.demo || d.me.role!=='ceo' || d.employees.length!==4)throw new Error('Demo isolation failed');
const employee = await request('provision',{ name:'Production smoke fixture', email:'qa@example.invalid', group:'QA fixtures' });
await request('assign',{ employeeId:employee.id,dueDate:'2026-10-31',attemptLimit:3 });
await request('setRole',{id:employee.id,role:'admin'});
d=await request('snapshot');
if(!d.employees.some(e=>e.id===employee.id&&e.role==='admin') || !d.assignments.some(a=>a.employeeId===employee.id))throw new Error('Persisted role/assignment missing');
const attempt=d.attempts.find(a=>a.employeeId==='DEMO001');
await request('feedback',{attemptId:attempt.id,text:'Production smoke fixture feedback.'});
await request('demoRole',{role:'employee'});
d=await request('snapshot');
if(d.employees.length!==1 || d.attempts.some(a=>a.employeeId!=='DEMO001') || !d.attempts.find(a=>a.id===attempt.id).feedback.some(f=>f.text==='Production smoke fixture feedback.'))throw new Error('Employee scope or feedback failed');
await request('setRole',{id:employee.id,role:'admin'},403);
await request('events',{attemptId:attempt.id,events:[]},403);
await request('logout'); await request('snapshot',{},401);
console.log('PASS: production anonymous denial, cross-origin denial, isolated demo provisioning, durable assignments and CEO role grants, employee record scoping, feedback, role denial, demo telemetry denial, logout. Real PlayFab sign-in and Unity playthrough are not covered.');
