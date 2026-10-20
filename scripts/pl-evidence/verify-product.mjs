import { readFile,writeFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { validateSnapshot,productFacts } from './snapshot.mjs';
import { buildEvidencePack } from '../../src/lib/pundit/evidence.ts';

const index=process.argv.indexOf('--out');
const base=resolve(index>=0?process.argv[index+1]:'pl-evidence-output');
const load=async name=>JSON.parse(await readFile(join(base,name),'utf8'));
const receipt=await load('receipt.json');
if(receipt.run_status!=='complete')throw Error('Cannot rehearse a partial product handoff');
const raw=await load(receipt.raw_file),normal=await load(receipt.normalised_file);
validateSnapshot(raw,normal);
let measurements=0;
for(const fixture of raw.fixtures){
  const [homeScore,awayScore]=fixture.score.split('-').map(Number);
  // Date-only contract rehearsal, not a fabricated kickoff or a database write.
  const match={id:`intake-contract:${fixture.provider_id}`,kickoffAt:`${fixture.date}T12:00:00Z`,
    homeTeam:fixture.home,awayTeam:fixture.away,homeScore,awayScore,competition:'Premier League',source:'contract-rehearsal'};
  const facts=productFacts(raw,normal,match);
  const pack=buildEvidencePack({match,events:[],intakeEvidence:{facts,unavailable:[]}});
  for(const fact of facts)if(!pack.facts.some(f=>f.id===fact.id&&f.value===fact.value&&f.provenance===fact.provenance))throw Error('Product lost an accepted intake fact');
  measurements+=facts.length;
}
const verdict={status:'passed',scope:'real collected snapshot through actual product evidence-pack builder; no live publication or database writes',
  fixtures:raw.fixtures.length,accepted_counted_measurements:measurements,shadow_signals_imported:0,unattributed_estimates_imported:0};
await writeFile(join(base,'product-contract-verification.json'),JSON.stringify(verdict,null,2)+'\n');
console.log(JSON.stringify(verdict,null,2));
