import test from 'node:test';
import assert from 'node:assert/strict';
import { daysForRun,canonicalTeam,fixtureFromFotmob,leagueFixtures,normalize,ledgerItem,matchKey,parseStats,validate,DOMAINS } from '../scripts/pl-evidence/core.mjs';
import { parseRss,exactApprovedUrl,discoverQuery } from '../scripts/pl-evidence/collect.mjs';
const f={date:'2026-10-18',home:'Arsenal',away:'Chelsea',score:'2-1',provider_id:42};
const rawFixture={id:42,home:{name:'Arsenal',score:2},away:{name:'Chelsea',score:1},status:{utcTime:'2026-10-18T15:00:00Z',finished:true}};
const raw=(ordinal,entry)=>ledgerItem(f,'fotmob.com',ordinal,entry);
test('thirty exact permitted sources, excluding fixture-only premierleague.com',()=>{assert.equal(DOMAINS.length,30);assert.ok(DOMAINS.includes('fotmob.com'));assert.ok(!DOMAINS.includes('premierleague.com'));});
test('London timezone and three fully completed dates',()=>{
  assert.deepEqual(daysForRun(new Date('2026-10-19T06:59:00Z')),['2026-10-16','2026-10-17','2026-10-18']);
  assert.deepEqual(daysForRun(new Date('2026-10-20T07:00:00Z')),['2026-10-17','2026-10-18','2026-10-19']);
  assert.deepEqual(daysForRun(new Date('2026-10-19T07:00:00Z'),'2026-10-18'),['2026-10-16','2026-10-17','2026-10-18']);
});
test('canonical alias table does not guess',()=>{assert.equal(canonicalTeam('Man City'),'Manchester City');assert.equal(canonicalTeam('Manchester C'),null);assert.equal(canonicalTeam('Coventry'),'Coventry City');});
test('fixture final and score gates',()=>{
  assert.equal(fixtureFromFotmob(rawFixture,f.date).score,'2-1');
  assert.equal(fixtureFromFotmob({...rawFixture,status:{...rawFixture.status,finished:false}},f.date).error,'not_final');
  assert.equal(fixtureFromFotmob({...rawFixture,away:{name:'Chelsea'}},f.date).error,'score_missing');
  assert.equal(fixtureFromFotmob({...rawFixture,home:{name:'Unknown',score:2}},f.date).error,'team_unresolved');
  const result=leagueFixtures({leagues:[{id:47,name:'Premier League',matches:[rawFixture]}]},f.date);
  assert.equal(result.matches.length,1);
  assert.throws(()=>leagueFixtures({leagues:[]},f.date),/absent/);
});
test('extract only explicit reported numeric match stats; reject unnamed xG model',()=>{
  const result=parseStats({content:{stats:{Periods:{All:{stats:[{title:'Shots',stats:[
    {title:'Total shots',stats:['13','8']},{title:'Ball possession',stats:['56%','44%']},
    {title:'Expected goals (xG)',stats:['1.65','0.81']},{title:'Unknown index',stats:['1','2']}]}]}}}}},f);
  assert.equal(result.raw.length,6);
  const output=normalize([f],result.raw,[],{window:'test'});
  assert.equal(output.tally.counted,4);assert.equal(output.tally.estimates,0);
  assert.equal(output.tally.rejected,2);assert.equal(output.rejected[0].reason,'model_unnamed');
  assert.equal(output.matches[0].counted.find(x=>x.field==='possession').value,'56%');
});
test('source conflict rejects both sides, never arbitrates',()=>{
  const input=[raw(1,{kind:'counted',field:'shots',side:'home',value:8}),raw(2,{kind:'counted',field:'shots',side:'home',value:9})];
  const out=normalize([f],input);
  assert.equal(out.tally.counted,0);assert.deepEqual(out.rejected.map(x=>x.reason),['sources_disagree','sources_disagree']);
});
test('strict E priority over D, followed by a narrow exact shadow quote',()=>{
  const input=[raw(1,{kind:'text',text:'Arsenal completed a comeback but then reported an injury'}),
    raw(2,{kind:'text',text:'Arsenal came from behind to beat Chelsea'})];
  const out=normalize([f],input);
  assert.equal(out.tally.refused,1);assert.equal(out.tally.shadow,1);
  assert.equal(out.matches[0].shadow_signals[0].quote,'came from behind');
  assert.equal(out.matches[0].refused[0].reason,'unlicensed_context');
});
test('no licensed claim is rejected; invalid double classification fails validation',()=>{
  const input=[raw(1,{kind:'text',text:'Arsenal and Chelsea played on Sunday.'})];
  const out=normalize([f],input);assert.equal(out.rejected[0].reason,'no_licensed_claim');
  out.matches[0].counted.push({match:matchKey(f),field:'shots',value:2,side:'home',source_item:input[0].id});
  assert.throws(()=>validate(out,input));
});
test('RSS extraction preserves publisher link; redirects and unrelated host not admitted',()=>{
  const xml='<rss><channel><item><title>Arsenal beat Chelsea</title><link>https://talksport.com/football/test</link><description>A late winner &amp; comeback</description><pubDate>Sun, 18 Oct 2026 22:00:00 GMT</pubDate></item></channel></rss>';
  assert.equal(parseRss(xml)[0].description,'A late winner & comeback');
  assert.equal(exactApprovedUrl(parseRss(xml)[0].url,'talksport.com'),true);
  assert.equal(exactApprovedUrl('https://talksport.com.evil.example/p','talksport.com'),false);
  assert.ok(discoverQuery(f,'talksport.com').startsWith('https://www.bing.com/'));
});

import { discoverFixtures } from '../scripts/pl-evidence/collect.mjs';
import { driveToken, uploadJson } from '../scripts/pl-evidence/drive.mjs';

test('independent fixture scorer refuses both conflicting results', async () => {
  const expected = { date: '20261018', leagues: [{ id: 47, ccode: 'ENG', name: 'Premier League', matches: [rawFixture] }] };
  const result = await discoverFixtures(['2026-10-18'], {
    footballDataKey: 'FAKE',
    req: async (url) => url.includes('football-data.org') ? {
      matches: [{ status: 'FINISHED', utcDate: '2026-10-18T15:00:00Z',
        homeTeam: { name: 'Arsenal FC' }, awayTeam: { name: 'Chelsea FC' },
        score: { fullTime: { home: 2, away: 0 } } }],
    } : expected,
  });
  assert.equal(result.matches.length, 0);
  assert.equal(result.rejected.filter(x => x.reason === 'sources_disagree').length, 2);
  assert.ok(result.rejected.some(x => x.item.includes('2-1')));
  assert.ok(result.rejected.some(x => x.item.includes('2-0')));
});

test('Drive OAuth secret produces bearer token, then verifies JSON bytes before success', async () => {
  const creds={client_id:'ID',client_secret:'CLIENT_SECRET',refresh_token:'REFRESH_TOKEN'};
  let stored=''; let count=0;
  const fakeRequest=async (url,options={})=>{
    count++;
    if(url==='https://oauth2.googleapis.com/token') {
      assert.equal(options.method,'POST');
      assert.equal(options.body.get('grant_type'),'refresh_token');
      return {ok:true,json:async()=>({access_token:'BEARER'})};
    }
    assert.equal(options.headers.Authorization,'Bearer BEARER');
    if(url.includes('/drive/v3/files/FOLDER_ID?'))return {ok:true,json:async()=>({id:'FOLDER_ID',mimeType:'application/vnd.google-apps.folder',capabilities:{canAddChildren:true}})};
    if(url.includes('/drive/v3/files?q='))return {ok:true,json:async()=>({files:[]})};
    if(url.includes('/upload/drive/v3/files')){
      stored=options.body.split('\r\nContent-Type: application/json\r\n\r\n')[1].split('\r\n--')[0];
      return {ok:true,json:async()=>({id:'NEW_ID',name:'test-window.json',mimeType:'application/json',parents:['FOLDER_ID']})};
    }
    if(url.includes('/drive/v3/files/NEW_ID?'))return {ok:true,text:async()=>stored};
    throw Error(`Unexpected URL: ${url}`);
  };
  const token=await driveToken(creds,fakeRequest);
  assert.equal(token,'BEARER');
  const result=await uploadJson('test-window.json',{window:'2026-10-16 to 2026-10-18'},
    {credentials:creds,folderId:'FOLDER_ID',request:fakeRequest});
  assert.equal(result.id,'NEW_ID');
  assert.ok(count>=5);
  assert.ok(result.sha256.length===64);
});

test('existing Drive filenames fail when stored bytes differ; never overwrite', async () => {
  let invokedPost=false;
  const req=async (url,options={})=>{
    if(url==='https://oauth2.googleapis.com/token')return {ok:true,json:async()=>({access_token:'BEARER'})};
    if(url.includes('/drive/v3/files/FOLDER_ID?'))return {ok:true,json:async()=>({id:'FOLDER_ID',mimeType:'application/vnd.google-apps.folder',capabilities:{canAddChildren:true}})};
    if(url.includes('/drive/v3/files?q='))return {ok:true,json:async()=>({files:[{id:'OLD',name:'test-window.json',mimeType:'application/json',parents:['FOLDER_ID']}]})};
    if(url.includes('/drive/v3/files/OLD?'))return {ok:true,text:async()=>'{"stale":true}\n'};
    if(options.method==='POST')invokedPost=true;
    throw Error('Unexpected request');
  };
  await assert.rejects(uploadJson('test-window.json',{window:'fresh'},
    {credentials:{client_id:'ID',client_secret:'SECRET',refresh_token:'TOKEN'},folderId:'FOLDER_ID',request:req}),/mismatch/);
  assert.equal(invokedPost,false);
});
import { fixtureFromEspn, espnFixtures, parseEspnStats } from '../scripts/pl-evidence/core.mjs';
import { collectMatchDetails } from '../scripts/pl-evidence/collect.mjs';

const espnFixture = {
  id:'1234567', date:'2026-10-18T15:00:00Z', status:{type:{completed:true}},
  competitions:[{competitors:[
    {homeAway:'away',team:{displayName:'Chelsea'},score:'1'},
    {homeAway:'home',team:{displayName:'Arsenal'},score:'2'},
  ]}],
};
test('ESPN auxiliary scoreboard confirms completed date, sides and exact score',()=>{
  const match=fixtureFromEspn(espnFixture,'2026-10-18');
  assert.equal(match.home,'Arsenal'); assert.equal(match.away,'Chelsea');
  assert.equal(match.score,'2-1'); assert.equal(match.source_domain,'espn.com');
  assert.equal(espnFixtures({events:[espnFixture]},'2026-10-18').matches.length,1);
  assert.equal(fixtureFromEspn({...espnFixture,status:{type:{completed:false}}},'2026-10-18').error,'not_final');
  assert.equal(fixtureFromEspn({...espnFixture,competitions:[{competitors:[]}]},'2026-10-18').error,'team_unresolved');
  assert.throws(()=>espnFixtures({events:null},'2026-10-18'),/schema/);
});
test('FotMob HTTP 404 falls back to ESPN with source manifest, not a fictional FotMob result',async()=>{
  const found=await discoverFixtures(['2026-10-18'],{
    req:async url=>{
      if(url.includes('fotmob.com'))throw Error('HTTP 404');
      if(url.includes('site.api.espn.com'))return {events:[espnFixture]};
      throw Error('unexpected request');
    },
  });
  assert.equal(found.matches.length,1);
  assert.equal(found.matches[0].source_domain,'espn.com');
  assert.ok(found.source_status.some(x=>x.domain==='fotmob.com' && x.status==='error'));
  assert.ok(found.source_status.some(x=>x.domain==='espn.com' && x.status==='found'));
  assert.ok(found.errors.includes('FOOTBALL_DATA_KEY not set; independent fixture/score reconciliation unavailable'));
  assert.ok(!found.errors.some(x=>x.includes('HTTP 404')));
});
test('ESPN boxscore maps only literal reported statistics to the correct side',async()=>{
  const fixture=fixtureFromEspn(espnFixture,'2026-10-18');
  const detail={boxscore:{teams:[
    {team:{displayName:'Arsenal'},statistics:[
      {name:'totalShots',displayValue:'14'},
      {name:'possessionPct',displayValue:'53%'},
      {name:'expectedGoals',displayValue:'1.4'},
    ]},
    {team:{displayName:'Chelsea'},statistics:[
      {name:'totalShots',displayValue:'8'},
    ]},
  ]}};
  const parsed=parseEspnStats(detail,fixture);
  assert.equal(parsed.errors.length,0);
  assert.equal(parsed.raw.length,3);
  assert.equal(parsed.raw.filter(x=>x.side==='home').length,2);
  assert.ok(parsed.raw.some(x=>x.field==='possession'&&x.value==='53%'));
  assert.ok(!parsed.raw.some(x=>x.field==='xg'));
  const fetched=await collectMatchDetails([fixture],{req:async url=>{
    assert.ok(url.includes('summary?event=1234567'));return detail;
  }});
  assert.equal(fetched.raw.length,3);
  assert.equal(fetched.coverage[0].domain,'espn.com');
});
test('Drive 403 returns its safe machine-readable reason and no token/body',async()=>{
  const req=async (url,options={})=>{
    if(url==='https://oauth2.googleapis.com/token')return {ok:true,json:async()=>({access_token:'SECRET_ACCESS_TOKEN'})};
    if(url.includes('/drive/v3/files/FOLDER_ID?'))return {
      ok:false,status:403,
      json:async()=>({error:{errors:[{reason:'insufficientPermissions',message:'sensitive account contents'}]}}),
    };
    throw Error('Unexpected call');
  };
  await assert.rejects(
    uploadJson('test-window.json',{window:'2026-10-18'},{
      credentials:{client_id:'ID',client_secret:'SECRET',refresh_token:'TOKEN'},
      folderId:'FOLDER_ID',request:req,
    }),
    e=>e.message==='Drive folder preflight HTTP 403 reason=insufficientPermissions',
  );
});

test('Authenticated football-data registry recovers blocked FotMob and ESPN without inventing independent verification',async()=>{
  const match={id:123,utcDate:'2026-10-18T15:00:00Z',status:'FINISHED',
    homeTeam:{name:'Arsenal FC'},awayTeam:{name:'Chelsea FC'},
    score:{fullTime:{home:2,away:1}}};
  const res=await discoverFixtures(['2026-10-18'],{
    footballDataKey:'PRESENT',
    req:async(url,options)=>{
      if(url.includes('football-data.org')){
        assert.equal(options.headers['X-Auth-Token'],'PRESENT');
        return {matches:[match]};
      }
      if(url.includes('fotmob.com'))throw Error('HTTP 404');
      if(url.includes('espn.com'))throw Error('HTTP 403');
      throw Error('Unexpected endpoint');
    },
  });
  assert.equal(res.matches.length,1);
  assert.equal(res.matches[0].source_domain,'football-data.org');
  assert.equal(res.matches[0].score,'2-1');
  assert.ok(res.errors.some(e=>e.includes('single-source finished fixture')));
  assert.ok(res.source_status.some(e=>e.domain==='fotmob.com'&&e.status==='error'));
  assert.ok(res.source_status.some(e=>e.domain==='espn.com'&&e.status==='error'));
  const detail=await collectMatchDetails(res.matches,{req:async()=>{throw Error('not allowed')}});
  assert.equal(detail.raw.length,0);
  assert.equal(detail.coverage[0].status,'not_available');
});
