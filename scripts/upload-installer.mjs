import { put, head, issueSignedToken, presignUrl } from '@vercel/blob';
import { createReadStream } from 'node:fs';
import { spawn } from 'node:child_process';
const file='C:/Users/garci/Documents/Codex/2026-10-08/files-pasted-by-the-user-revise/outputs/EasyExpress-Training-Windows.zip';
const pathname='builds/EasyExpress-Training-Windows.zip';
let previous;try{previous=await head(pathname,{token:process.env.BLOB_READ_WRITE_TOKEN});}catch(e){if(e.name!=='BlobNotFoundError')throw e;}
const blob=await put(pathname,createReadStream(file),{ access:'private',token:process.env.BLOB_READ_WRITE_TOKEN,multipart:true,addRandomSuffix:false,allowOverwrite:Boolean(previous),...(previous?{ifMatch:previous.etag}:{}),contentType:'application/zip' });
const h=await head(blob.pathname,{token:process.env.BLOB_READ_WRITE_TOKEN});
const unsigned=await fetch(blob.url);if(unsigned.ok)throw new Error('Installer is publicly readable');
const signed=await issueSignedToken({pathname,operations:['get'],validUntil:Date.now()+60000,token:process.env.BLOB_READ_WRITE_TOKEN});
const u=await presignUrl(signed,{operation:'get',pathname,access:'private',useCache:false});
const read=await fetch(u.presignedUrl,{headers:{Range:'bytes=0-3'}});const bytes=new Uint8Array(await read.arrayBuffer());
if(read.status!==206||bytes[0]!==80||bytes[1]!==75)throw new Error('Signed installer range request failed');
await new Promise((resolve,reject)=>{const p=spawn('npx.cmd',['--yes','vercel@latest','env','add','TRAINING_INSTALLER_PATH','production','--yes','--force'],{shell:true,windowsHide:true,stdio:['pipe','pipe','pipe']});let output='';p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>output+=b);p.stdin.end(pathname);p.on('exit',code=>code===0?resolve():reject(new Error(output)));});
console.log(`PASS: private installer uploaded (${Math.round(h.size/1024/1024)} MiB); anonymous fetch denied; one-file signed GET range verified. Installer path configured.`);
