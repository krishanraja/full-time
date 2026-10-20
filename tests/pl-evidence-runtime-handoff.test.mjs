import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync,privateDecrypt,createDecipheriv } from 'node:crypto';
import { mkdtemp,readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

test('runtime handoff stores ciphertext only, bound to the ephemeral recipient and purpose',async()=>{
  const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:3072});
  const cwd=await mkdtemp(join(tmpdir(),'evidence-handoff-test-'));
  const oauth=JSON.stringify({client_id:'SYNTHETIC_ID',refresh_token:'SYNTHETIC_TOKEN'});
  const result=spawnSync(process.execPath,[resolve('scripts/pl-evidence/seal-runtime.mjs')],{cwd,encoding:'utf8',env:{...process.env,
    RECIPIENT_PUBLIC_KEY:publicKey.export({format:'der',type:'spki'}).toString('base64'),GOOGLE_DRIVE_OAUTH_JSON:oauth,CRON_SECRET:'SYNTHETIC_CRON'}});
  assert.equal(result.status,0);
  const artifact=await readFile(join(cwd,'sealed-runtime.json'),'utf8');
  for(const marker of ['SYNTHETIC_ID','SYNTHETIC_TOKEN','SYNTHETIC_CRON'])assert.ok(!`${artifact}${result.stdout}${result.stderr}`.includes(marker));
  const sealed=JSON.parse(artifact),key=privateDecrypt({key:privateKey,oaepHash:'sha256'},Buffer.from(sealed.key,'base64'));
  const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(sealed.iv,'base64'));
  decipher.setAAD(Buffer.from('full-time-evidence-activation-v1'));decipher.setAuthTag(Buffer.from(sealed.tag,'base64'));
  const payload=JSON.parse(Buffer.concat([decipher.update(Buffer.from(sealed.data,'base64')),decipher.final()]).toString());
  assert.equal(payload.oauth,oauth);assert.equal(payload.cron,'SYNTHETIC_CRON');
  assert.ok(payload.expires>Date.now() && payload.expires<Date.now()+16*60*1000);
  const other=generateKeyPairSync('rsa',{modulusLength:3072});
  assert.throws(()=>privateDecrypt({key:other.privateKey,oaepHash:'sha256'},Buffer.from(sealed.key,'base64')));
});
