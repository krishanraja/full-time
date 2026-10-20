import { randomBytes,createCipheriv,publicEncrypt,createPublicKey } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

// Manual operator-only handoff. The private recipient key never leaves its
// operator process. No plaintext credential is written or returned by this job.
const recipient=process.env.RECIPIENT_PUBLIC_KEY;
if(!recipient || !process.env.GOOGLE_DRIVE_OAUTH_JSON || !process.env.CRON_SECRET)throw Error('Required runtime handoff inputs unavailable');
const publicKey=createPublicKey({key:Buffer.from(recipient,'base64'),format:'der',type:'spki'});
if(publicKey.asymmetricKeyType!=='rsa' || publicKey.asymmetricKeyDetails.modulusLength<3072)throw Error('Recipient requires RSA-3072 or stronger');
JSON.parse(process.env.GOOGLE_DRIVE_OAUTH_JSON);
const payload=Buffer.from(JSON.stringify({purpose:'full-time-evidence-activation',project:'prj_h5tPIn5vUVTP5noFWzdqswFQTZcn',
  expires:Date.now()+15*60*1000,oauth:process.env.GOOGLE_DRIVE_OAUTH_JSON,cron:process.env.CRON_SECRET}));
const key=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
cipher.setAAD(Buffer.from('full-time-evidence-activation-v1'));
const encrypted=Buffer.concat([cipher.update(payload),cipher.final()]);
const envelope={version:1,key:publicEncrypt({key:publicKey,oaepHash:'sha256'},key).toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:encrypted.toString('base64')};
payload.fill(0);key.fill(0);
await writeFile('sealed-runtime.json',JSON.stringify(envelope)+'\n');
console.log('Encrypted runtime handoff prepared; expires in 15 minutes.');
