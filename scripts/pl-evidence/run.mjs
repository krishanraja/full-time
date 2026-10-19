#!/usr/bin/env node
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { daysForRun, DOMAINS, normalize, ledgerItem, matchKey, validate } from './core.mjs';
import { discoverFixtures, collectMatchDetails, collectNews } from './collect.mjs';
import { uploadJson, checkDriveFolder } from './drive.mjs';

function arg(flag){const pos=process.argv.indexOf(flag);return pos<0?null:process.argv[pos+1];}
function shortError(error){return String(error?.message||error).slice(0,180);}
async function save(path,json){await writeFile(path,JSON.stringify(json,null,2)+'\n','utf8');JSON.parse(await readFile(path,'utf8'));}
async function main(){
  const end=arg('--end');
  const days=daysForRun(new Date(),end);
  const window=`${days[0]} to ${days[2]}`;
  const base=resolve(arg('--out')||'pl-evidence-output');
  await mkdir(base,{recursive:true});
  const rawFile=`premier-league-raw-${days[0]}-to-${days[2]}.json`;
  const finalFile=`premier-league-normalised-${days[0]}-to-${days[2]}.json`;
  const problems=[],warnings=[];let fixtures=[],fixturesRejected=[],source_status=[],statsItems=[],newsItems=[],newsCoverage=[];
  const footballDataKey=process.env.FOOTBALL_DATA_KEY||'';
  const apiFootballKey=process.env.API_FOOTBALL_KEY||'';
  if(arg('--fixtures')){
    const fixtureInput=JSON.parse(await readFile(resolve(arg('--fixtures')),'utf8'));
    fixtures=fixtureInput.matches;
    fixturesRejected=fixtureInput.rejected||[];
    source_status=fixtureInput.source_status||[];
    problems.push('Fixture override in use: external fixture coverage not verified');
  }else{
    const fx=await discoverFixtures(days,{footballDataKey,apiFootballKey});
    fixtures=fx.matches;fixturesRejected=fx.rejected;source_status=fx.source_status;
    problems.push(...fx.errors);
  }
  if(!fixtures.length)problems.push('No complete fixtures verified; cannot treat empty output as no games');
  if(fixturesRejected.some(x=>['team_unresolved','score_missing'].includes(x.reason)))
    problems.push(`Finished fixture records rejected: ${fixturesRejected.filter(x=>['team_unresolved','score_missing'].includes(x.reason)).length}; fixture completeness unverified`);
  const scores=fixtures.flatMap(f=>['home','away'].map((side,i)=>ledgerItem(f,f.source_domain||'fotmob.com',1000+i,{
    kind:'counted',field:'goals',value:Number(f.score.split('-')[i]),side,
    text:`Final score ${f.score}; ${side} goals ${f.score.split('-')[i]}`,
    source_url:f.fixture_source_url||`https://www.fotmob.com/api/matches?date=${f.date.replaceAll('-','')}`,
    provenance:'match_center',
  })));
  let coverage=[];
  if(!arg('--fixtures')){
    const detailed=await collectMatchDetails(fixtures,{apiFootballKey});
    statsItems=detailed.raw;coverage.push(...detailed.coverage);warnings.push(...detailed.errors);
    const news=await collectNews(fixtures,{maxQueries:Number(process.env.FT_MAX_NEWS_QUERIES||350),concurrency:6});
    newsItems=news.raw;newsCoverage=news.coverage;coverage.push(...news.coverage);
    if(news.errors.length)warnings.push(`News discovery errors: ${news.errors.length} (see source_status)`);
  }
  const items=[...scores,...statsItems,...newsItems];
  const allSourceStatus=[...source_status,...coverage];
  // Never imply that source coverage is complete just because no article was found.
  const expectedDiscovery=fixtures.length*(DOMAINS.length-1);
  const attemptedDiscovery=newsCoverage.filter(x=>x.status!=='not_attempted').length;
  if(!arg('--fixtures') && attemptedDiscovery!==expectedDiscovery)problems.push(`Source discovery only attempted ${attemptedDiscovery}/${expectedDiscovery} fixture-domain pairs`);
  const targetFolder=process.env.FT_DRIVE_FOLDER_ID||'1g1ZmO3PtsC54XudqxL7DlajkD9Nrzfcp';
  let credentials=null;
  try {
    const rawCredentials=process.env.GOOGLE_DRIVE_OAUTH_JSON || process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON;
    if (rawCredentials) credentials=JSON.parse(rawCredentials);
  } catch { problems.push('Google Drive authentication secret is invalid JSON'); }
  if(!credentials)problems.push('Google Drive OAuth or service-account secret unavailable: GitHub artifacts only');
  const raw={schema_version:1,window,fixtures,
    fixture_rejections:fixturesRejected,source_status:allSourceStatus,items,
    notes:['Raw RSS excerpts are headlines/descriptions only, never full-page commentary.',
      'Missing or blocked domains are not represented as evidence.',
      'ESPN is an auxiliary fixture/match-centre fallback, not one of the thirty approved opinion domains.',
      'External fixture verification (if enabled) is metadata, not classified editorial evidence.'],
  };
  const manifest={domains:DOMAINS,source_status:allSourceStatus,fixture_source:apiFootballKey?'api-football.com_with_public_fallback':'public_with_football-data_registry',
    independent_crosscheck:footballDataKey?'football-data.org_attempted':'not_configured',
    expected_finished_fixtures:fixtures.length,discovered_finished_fixtures:fixtures.length};
  const normal=normalize(fixtures,items,fixturesRejected,{
    window,evidence_manifest:manifest,run_status:problems.length?'partial':'complete',run_errors:problems,
  });
  const rawPath=join(base,rawFile),finalPath=join(base,finalFile);
  await save(rawPath,raw);await save(finalPath,normal);
  let uploaded=[];
  let drivePreflight={status:'not_attempted'};
  if(credentials){
    try{drivePreflight=await checkDriveFolder(credentials,targetFolder);}
    catch(error){drivePreflight={status:'error',error:shortError(error)};problems.push(`Google Drive preflight failed: ${shortError(error)}`);}
  }
  if(credentials && !problems.length){
    try{
      uploaded.push(await uploadJson(rawFile,raw,{credentials,folderId:targetFolder}));
      // Upload normalised output last, after raw archive exists and validates.
      validate(normal,items);
      uploaded.push(await uploadJson(finalFile,normal,{credentials,folderId:targetFolder}));
    }catch(error){
      problems.push(`Google Drive delivery failed: ${shortError(error)}`);
      normal.run_status='partial';normal.run_errors=problems;
      await save(finalPath,normal);
    }
  }
  const receipt={window,run_status:problems.length?'partial':'complete',fixtures:fixtures.length,
    tally:normal.tally,raw_file:rawFile,normalised_file:finalFile,drive_files:uploaded,
    errors:problems,warnings,drive_preflight:drivePreflight,
    source_queries:{expected:expectedDiscovery,attempted:attemptedDiscovery}};
  await save(join(base,'receipt.json'),receipt);
  const summary=`### Premier League evidence ${window}\n\nStatus: **${receipt.run_status}** · fixtures: ${fixtures.length}\n\nCounted ${normal.tally.counted}, models ${normal.tally.estimates}, derived ${normal.tally.derived}, shadow ${normal.tally.shadow}, refused ${normal.tally.refused}, rejected ${normal.tally.rejected}.\n\nDrive files: ${uploaded.map(x=>x.url||x.id).join(', ')||'none'}\n\nErrors: ${problems.length?problems.slice(0,15).join('; '):'none'}\n`;
  if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,summary,{flag:'a'});
  console.log(JSON.stringify(receipt,null,2));
  if(problems.length)process.exitCode=1;
}
main().catch(e=>{console.error(`Evidence pipeline fatal error: ${shortError(e)}`);process.exitCode=1;});
