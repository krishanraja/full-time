import { normalize, matchKey, daysForRun, canonicalTeam,toLondonDate } from './core.mjs';
import { readJsonFile, jsonHash,uploadJson } from './drive.mjs';

export function snapshotNames(end){
  const days=daysForRun(new Date(),end),suffix=`${days[0]}-to-${days[2]}`;
  return {raw:`premier-league-raw-v2-${suffix}.json`,normal:`premier-league-normalised-v2-${suffix}.json`,commit:`premier-league-commit-${suffix}.json`,window:`${days[0]} to ${days[2]}`};
}

/** The producer and product use the same closed-world acceptance boundary. */
export function validateSnapshot(raw,normal){
  if(raw?.schema_version!==2 || normal?.run_status!=='complete' || normal.run_errors?.length || raw.window!==normal.window)throw Error('Incomplete or incompatible evidence snapshot');
  const [start,end]=raw.window.split(' to '),names=snapshotNames(end);
  if(names.window!==raw.window || start>end)throw Error('Invalid snapshot window');
  const manifest=normal.evidence_manifest;
  if(!Array.isArray(manifest?.expected_fixture_keys) || !Array.isArray(manifest?.verification))throw Error('Independent completeness proof missing');
  const keys=raw.fixtures.map(matchKey).sort();
  if(new Set(keys).size!==keys.length || JSON.stringify(keys)!==JSON.stringify([...manifest.expected_fixture_keys].sort()))throw Error('Fixture coverage mismatch');
  if(manifest.expected_finished_fixtures!==keys.length || manifest.discovered_finished_fixtures!==keys.length)throw Error('Fixture counts mismatch');
  for(const fixture of raw.fixtures){
    if(fixture.date<start || fixture.date>end)throw Error('Fixture outside window');
    const check=manifest.verification.filter(v=>v.match===matchKey(fixture));
    if(check.length!==1 || check[0].score!==fixture.score || new Set(check[0].providers).size<2)throw Error('Independent score proof missing');
  }
  if(new Set(raw.items.map(i=>i.id)).size!==raw.items.length)throw Error('Duplicate raw identity');
  const rebuilt=normalize(raw.fixtures,raw.items,raw.fixture_rejections);
  for(const key of ['matches','rejected','tally'])if(JSON.stringify(rebuilt[key])!==JSON.stringify(normal[key]))throw Error(`Normalised ${key} does not reproduce raw ledger`);
  for(const match of normal.matches)for(const item of match.counted){
    const source=raw.items.find(r=>r.id===item.source_item);
    if(source?.event_key && ['scorer','assists','yellow_cards','red_cards','substitutions'].includes(item.field)){
      if(typeof item.value!=='string' || !item.value.trim())throw Error('Invalid named match event');
      continue;
    }
    const value=typeof item.value==='string'&&item.value.endsWith('%')?Number(item.value.slice(0,-1)):item.value;
    if(typeof value!=='number' || !Number.isFinite(value) || value<0 || (item.field==='possession'?value>100:!Number.isInteger(value)))throw Error('Invalid counted value');
  }
  return true;
}

export async function readSnapshot(end,options){
  const names=snapshotNames(end);
  const seal=await readJsonFile(names.commit,options);
  if(!seal)return null;
  const commit=seal.value;
  if(commit.schema_version!==2 || commit.window!==names.window || commit.raw_file!==names.raw || commit.normalised_file!==names.normal)throw Error('Invalid snapshot commit');
  const [raw,normal]=await Promise.all([readJsonFile(names.raw,options),readJsonFile(names.normal,options)]);
  if(!raw || !normal || raw.sha256!==commit.raw_sha256 || normal.sha256!==commit.normalised_sha256)throw Error('Snapshot hash/readback mismatch');
  validateSnapshot(raw.value,normal.value);
  return {raw:raw.value,normal:normal.value,commit,commit_sha256:seal.sha256};
}

export function sealSnapshot(raw,normal){
  validateSnapshot(raw,normal);
  const names=snapshotNames(raw.window.split(' to ')[1]);
  return {schema_version:2,window:raw.window,raw_file:names.raw,normalised_file:names.normal,
    raw_sha256:jsonHash(raw),normalised_sha256:jsonHash(normal),run_status:'complete',fixtures:raw.fixtures.length};
}

/** Resume an interrupted delivery from the original raw bytes, never recollect
 * mutable news into a filename whose upload may already have succeeded. */
export async function recoverSnapshot(end,options){
  const existing=await readSnapshot(end,options);
  if(existing)return existing;
  const names=snapshotNames(end),archive=await readJsonFile(names.raw,options);
  if(!archive)return null;
  const raw=archive.value;
  const normal=normalize(raw.fixtures,raw.items,raw.fixture_rejections,{window:raw.window,
    evidence_manifest:raw.evidence_manifest,run_status:'complete',run_errors:[]});
  const commit=sealSnapshot(raw,normal);
  await uploadJson(names.normal,normal,options);
  await uploadJson(names.commit,commit,options);
  return readSnapshot(end,options);
}

/** Allowlist counted measurements only. No snippets, opinions, events inferred
 * from totals, derived values or model estimates cross this product boundary. */
export function productFacts(raw,normal,match){
  validateSnapshot(raw,normal);
  const key=`${toLondonDate(match.kickoffAt)}|${canonicalTeam(match.homeTeam)}|${canonicalTeam(match.awayTeam)}`;
  const record=normal.matches.find(m=>matchKey(m)===key);
  if(!record)throw Error('Snapshot does not contain exact product fixture');
  if(record.score!==`${match.homeScore}-${match.awayScore}`)throw Error('Product score disagrees with snapshot');
  const fields={shots:'shots',shots_on_target:'sot',possession:'possession',corners:'corners',saves:'saves',blocked_shots:'blocked'};
  const facts=new Map();
  for(const item of record.counted){
    if(!fields[item.field])continue;
    const source=raw.items.find(r=>r.id===item.source_item);
    const id=`stats.${item.side}_${fields[item.field]}`;
    const value=typeof item.value==='string'?Number(item.value.replace('%','')):item.value;
    const fact={id,kind:'fact',label:`${item.side==='home'?'Home':'Away'} ${item.field.replaceAll('_',' ')}`,value,
      source:`verified evidence intake: ${source.domain}`,provenance:`snapshot:${jsonHash(normal)};raw:${item.source_item}`};
    if(facts.has(id)&&facts.get(id).value!==value)throw Error('Conflicting product measurement');
    facts.set(id,fact);
  }
  return [...facts.values()];
}
