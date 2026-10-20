import { readFile,writeFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { productFacts,validateSnapshot } from './snapshot.mjs';

const position=process.argv.indexOf('--out'),base=resolve(position<0?'pl-evidence-output':process.argv[position+1]);
const load=async name=>JSON.parse(await readFile(join(base,name),'utf8'));
const receipt=await load('receipt.json');
const results=[];
let failure=null;
try{
  const origin=new URL(process.env.FULL_TIME_URL||'https://fulltime.fm');
  if(origin.protocol!=='https:' || origin.hostname!=='fulltime.fm' || !process.env.CRON_SECRET)throw Error('Approved product origin or machine authentication missing');
  const raw=await load(receipt.raw_file),normal=await load(receipt.normalised_file);
  validateSnapshot(raw,normal);
  for(const fixture of raw.fixtures){
    if(fixture.source_domain!=='api-football.com')throw Error('Product fixture ID cannot be inferred from another provider');
    const matchId=`af_${fixture.provider_id}`;
    const response=await fetch(new URL(`/api/internal/evidence-intake?matchId=${encodeURIComponent(matchId)}`,origin),{
      headers:{Authorization:`Bearer ${process.env.CRON_SECRET}`},signal:AbortSignal.timeout(90000),redirect:'error'});
    if(!response.ok)throw Error(`Product readback HTTP ${response.status} for ${matchId}`);
    const result=await response.json();
    const [homeScore,awayScore]=fixture.score.split('-').map(Number);
    const expected=productFacts(raw,normal,{kickoffAt:`${fixture.date}T12:00:00Z`,homeTeam:fixture.home,awayTeam:fixture.away,homeScore,awayScore});
    if(result.status!=='verified' || result.matchId!==matchId || result.coverageDate!==fixture.date || result.score!==fixture.score || result.facts?.length!==expected.length
      || expected.some(f=>!result.facts.some(r=>r.id===f.id&&r.value===f.value&&r.provenance===f.provenance&&r.consumed===true)))throw Error(`Product measurements or lineage mismatch for ${matchId}`);
    results.push({matchId,status:'verified',measurements:expected.length});
  }
}catch(error){failure=String(error.message||'Product readback failed').slice(0,180);}
const report={status:failure?'failed':'passed',scope:'authenticated live product match loader and evidence-pack builder',fixtures:results.length,
  measurements:results.reduce((sum,r)=>sum+r.measurements,0),results,errors:failure?[failure]:[],modelCalls:0,databaseWrites:false};
receipt.product_readback=report;
if(failure){receipt.run_status='partial';receipt.errors=[...(receipt.errors??[]),failure];}
await writeFile(join(base,'live-product-verification.json'),JSON.stringify(report,null,2)+'\n');
await writeFile(join(base,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(failure)process.exitCode=1;
