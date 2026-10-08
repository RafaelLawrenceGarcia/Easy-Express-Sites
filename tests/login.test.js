import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomBytes } from 'node:crypto';
import handler from '../api/training.js';
import { Store } from '../server/store.js';

test('verified CEO bootstraps access; a different verified account gets its own ID without promotion', async () => {
  const dir=await mkdtemp(path.join(os.tmpdir(),'ee-login-'));
  const keys=['TRAINING_LOCAL_DIR','TRAINING_DATA_KEY','EASY_EXPRESS_CEO_PLAYFAB_ID','VERCEL'];
  const previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  const originalFetch=globalThis.fetch;
  let accountId='CA613F3FEACEFDC6';
  process.env.TRAINING_LOCAL_DIR=dir;process.env.TRAINING_DATA_KEY=randomBytes(32).toString('hex');process.env.EASY_EXPRESS_CEO_PLAYFAB_ID=accountId;delete process.env.VERCEL;
  globalThis.fetch=async url=>new Response(JSON.stringify({code:200,data:String(url).endsWith('LoginWithEmailAddress')?{SessionTicket:'fixture-session-ticket'}:{AccountInfo:{PlayFabId:accountId,Username:'FixtureOwner',PrivateInfo:{Email:'fixture@example.invalid'}}}}),{headers:{'Content-Type':'application/json'}});
  const login=async()=>{const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(p){this.body=p;return this;}};
    await handler({method:'POST',headers:{host:'localhost',origin:'http://localhost'},body:{action:'login',email:'fixture@example.invalid',password:'fixture-password',role:'ceo',employeeId:'CA613F3FEACEFDC6'}},res);return res;};
  try {
    let res=await login();assert.equal(res.statusCode,200);assert.equal(res.body.data.me.role,'ceo');assert.ok(res.headers['Set-Cookie']);
    accountId='ACD5808EE029F206';res=await login();assert.equal(res.statusCode,403);assert.equal(res.body.account.playFabId,accountId);assert.equal(res.body.account.isConfiguredCEO,false);assert.equal(res.headers['Set-Cookie'],undefined);
    const {state}=await new Store().read();assert.equal(state.employees.length,1);assert.equal(state.employees[0].id,'CA613F3FEACEFDC6');
  } finally {globalThis.fetch=originalFetch;for(const k of keys){if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}await rm(dir,{recursive:true,force:true});}
});
