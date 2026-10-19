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
    if(url.includes('/drive/v3/files?q='))return {ok:true,json:async()=>({files:[{id:'OLD',name:'test-window.json',mimeType:'application/json',parents:['FOLDER_ID']}]})};
    if(url.includes('/drive/v3/files/OLD?'))return {ok:true,text:async()=>'{"stale":true}\n'};
    if(options.method==='POST')invokedPost=true;
    throw Error('Unexpected request');
  };
  await assert.rejects(uploadJson('test-window.json',{window:'fresh'},
    {credentials:{client_id:'ID',client_secret:'SECRET',refresh_token:'TOKEN'},folderId:'FOLDER_ID',request:req}),/mismatch/);
  assert.equal(invokedPost,false);
});