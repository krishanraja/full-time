import test from 'node:test';
import assert from 'node:assert/strict';
import { ledgerItem,matchKey,normalize,parseApiFootballEvents } from '../scripts/pl-evidence/core.mjs';
import { discoverFixtures } from '../scripts/pl-evidence/collect.mjs';
import { productFacts,validateSnapshot,sealSnapshot,readSnapshot,recoverSnapshot,snapshotNames } from '../scripts/pl-evidence/snapshot.mjs';
import { uploadJson } from '../scripts/pl-evidence/drive.mjs';
import { buildEvidencePack } from '../src/lib/pundit/evidence.ts';

const f={date:'2026-10-18',home:'Arsenal',away:'Chelsea',score:'2-1',provider_id:42,source_domain:'api-football.com'};
const productMatch={id:'af_42',kickoffAt:'2026-10-18T15:00:00Z',homeTeam:'Arsenal',awayTeam:'Chelsea',homeScore:2,awayScore:1,source:'test',competition:'Premier League'};
function bundle(){
  const items=[ledgerItem(f,'api-football.com',1,{kind:'counted',field:'shots',value:13,side:'home'}),
    ledgerItem(f,'bbc.com',2,{kind:'text',text:'Arsenal came from behind to beat Chelsea'}),
    ledgerItem(f,'api-football.com',3,{kind:'estimate',field:'xg',value:1.8,side:'home'})];
  const raw={schema_version:2,window:'2026-10-16 to 2026-10-18',fixtures:[f],items,fixture_rejections:[]};
  const normal=normalize([f],items,[],{window:raw.window,run_status:'complete',run_errors:[],evidence_manifest:{
    expected_fixture_keys:[matchKey(f)],expected_finished_fixtures:1,discovered_finished_fixtures:1,
    verification:[{match:matchKey(f),score:f.score,providers:['api-football.com','football-data.org']}]}});
  raw.evidence_manifest=normal.evidence_manifest;
  return {raw,normal};
}
test('producer ledger reaches actual product evidence pack without shadow or estimate leakage',()=>{
  const {raw,normal}=bundle();
  const facts=productFacts(raw,normal,productMatch);
  const pack=buildEvidencePack({match:productMatch,events:[],intakeEvidence:{facts,unavailable:[]}});
  const value=pack.facts.find(f=>f.id==='stats.home_shots');
  assert.equal(value.value,13);assert.match(value.provenance,/raw:2026-10-18/);
  assert.equal(facts.length,1);assert.ok(!JSON.stringify(pack).includes('came from behind'));
  assert.ok(!pack.facts.some(f=>f.id.includes('xg')));
});
test('recorded event shapes preserve named goals, assists and cards without inferring penalty assists',()=>{
  const event=(type,detail,name,assist)=>({type,detail,time:{elapsed:65,extra:0},team:{name:'Arsenal'},player:{id:1,name},assist:{name:assist}});
  const parsed=parseApiFootballEvents({response:[event('Goal','Normal Goal','Player One','Player Two'),event('Goal','Penalty','Player One','Player Two'),event('Card','Yellow Card','Player Three')]},f);
  assert.equal(parsed.raw.filter(i=>i.field==='assists').length,1);
  assert.equal(parsed.raw.filter(i=>i.field==='scorer').length,2);
  const b=bundle();b.raw.items.push(...parsed.raw);b.normal=normalize([f],b.raw.items,[],{window:b.raw.window,run_status:'complete',run_errors:[],evidence_manifest:b.raw.evidence_manifest});
  assert.equal(validateSnapshot(b.raw,b.normal),true);
  assert.equal(productFacts(b.raw,b.normal,productMatch).length,1);
});
test('product rejects mismatched score and conflicting existing statistic',()=>{
  const {raw,normal}=bundle();
  assert.throws(()=>productFacts(raw,normal,{...productMatch,homeScore:3}),/score disagrees/);
  const facts=productFacts(raw,normal,productMatch);
  assert.throws(()=>buildEvidencePack({match:productMatch,events:[],stats:{homeShots:14,source:'database'},intakeEvidence:{facts,unavailable:[]}}),/conflicts/);
  const pack=buildEvidencePack({match:productMatch,events:[],stats:{homeShots:13,source:'database'},intakeEvidence:{facts,unavailable:[]}});
  assert.equal(pack.facts.filter(f=>f.id==='stats.home_shots').length,1);
});
test('corrupted, partial, single-source and incomplete snapshots fail closed',()=>{
  for(const corrupt of [
    b=>{b.normal.matches[0].counted[0].value=99;},
    b=>{b.normal.run_status='partial';},
    b=>{b.normal.evidence_manifest.verification[0].providers=['api-football.com'];},
    b=>{b.normal.evidence_manifest.expected_fixture_keys.push('missing');},
    b=>{b.raw.items.push(b.raw.items[0]);},
  ]){const b=bundle();corrupt(b);assert.throws(()=>validateSnapshot(b.raw,b.normal));}
});
test('a conflict poisons the fixture even when another provider agrees',async()=>{
  const data={matches:[{id:42,status:'FINISHED',utcDate:'2026-10-18T15:00:00Z',homeTeam:{name:'Arsenal'},awayTeam:{name:'Chelsea'},score:{fullTime:{home:2,away:1}}}]};
  const result=await discoverFixtures([f.date],{footballDataKey:'TEST',apiFootballKey:'TEST',req:async url=>{
    if(url.includes('football-data.org'))return data;
    if(url.includes('api-sports'))return {response:[{league:{id:39},fixture:{id:42,date:'2026-10-18T15:00:00Z',status:{short:'FT'}},teams:{home:{name:'Arsenal'},away:{name:'Chelsea'}},goals:{home:2,away:0}}]};
    throw Error('public endpoints must not be needed');
  }});
  assert.equal(result.matches.length,0);assert.ok(result.errors.some(e=>e.includes('conflict')));
  assert.deepEqual(result.expected_fixture_keys,[matchKey(f)]);
});
test('missing fixture and legitimate no-game windows have independent completeness evidence',async()=>{
  const result=await discoverFixtures([f.date],{footballDataKey:'TEST',apiFootballKey:'TEST',req:async url=>url.includes('football-data.org')?{matches:[]}:{response:[]}});
  assert.deepEqual(result.expected_fixture_keys,[]);assert.deepEqual(result.errors,[]);
  const {raw,normal}=bundle();raw.fixtures=[];assert.throws(()=>validateSnapshot(raw,normal),/coverage/);
});
test('Drive commit is read last, reruns reuse identical bytes and corruption is rejected',async()=>{
  const store=new Map();let creates=0;
  const request=async(url,options={})=>{
    if(url.includes('oauth2.googleapis'))return {ok:true,json:async()=>({access_token:'TEST'})};
    if(url.includes('/files/FOLDER?'))return {ok:true,json:async()=>({id:'FOLDER',mimeType:'application/vnd.google-apps.folder',capabilities:{canAddChildren:true}})};
    if(url.includes('/files?q=')){
      const name=new URL(url).searchParams.get('q').match(/name = '([^']+)'/)[1];
      const file=store.get(name);return {ok:true,json:async()=>({files:file?[file.meta]:[]})};
    }
    if(url.includes('/upload/')){
      const meta=JSON.parse(options.body.split('\r\n\r\n')[1].split('\r\n--')[0]);
      const content=options.body.split('\r\nContent-Type: application/json\r\n\r\n')[1].split('\r\n--')[0];
      meta.id=meta.name;store.set(meta.name,{meta,content});creates++;
      return {ok:true,json:async()=>meta};
    }
    const id=decodeURIComponent(new URL(url).pathname.split('/').at(-1));
    return {ok:true,text:async()=>store.get(id).content};
  };
  const options={credentials:{client_id:'TEST',client_secret:'TEST',refresh_token:'TEST'},folderId:'FOLDER',request};
  const {raw,normal}=bundle(),names=snapshotNames('2026-10-18'),commit=sealSnapshot(raw,normal);
  await uploadJson(names.raw,raw,options);
  assert.equal(await readSnapshot('2026-10-18',options),null,'uncommitted files cannot reach product');
  await recoverSnapshot('2026-10-18',options);
  const first=await readSnapshot('2026-10-18',options);
  await uploadJson(names.raw,raw,options);assert.equal(creates,3);
  assert.deepEqual(first.normal,normal);
  store.get(names.raw).content+=' ';
  await assert.rejects(()=>readSnapshot('2026-10-18',options),/hash/);
});
