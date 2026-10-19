import { createHash } from 'node:crypto';

export const DOMAINS = Object.freeze([
  'football365.com','bbc.com','theguardian.com','planetfootball.com','90min.com',
  'teamtalk.com','sportsmole.co.uk','spielverlagerung.com','breakingthelines.com',
  'zonalmarking.net','theanalyst.com','blogarchive.statsbomb.com','understat.com',
  'fbref.com','reddit.com','talksport.com','football.london','manchestereveningnews.co.uk',
  'liverpoolecho.co.uk','thisisanfield.com','arseblog.com','theanfieldwrap.com',
  'holdingmidfield.com','thefalse9.com','footballdna.co.uk','statsbomb.com',
  'whoscored.com','fotmob.com','bigsoccer.com','footballtransfers.com',
]);

export const CLUBS_2026 = Object.freeze([
  'AFC Bournemouth','Arsenal','Aston Villa','Brentford','Brighton & Hove Albion',
  'Chelsea','Coventry City','Crystal Palace','Everton','Fulham','Hull City',
  'Ipswich Town','Leeds United','Liverpool','Manchester City','Manchester United',
  'Newcastle United','Nottingham Forest','Sunderland','Tottenham Hotspur',
]);
// Only explicit spelling aliases. Unknown clubs fail closed; never fuzzy-match.
export const ALIASES = Object.freeze({
  'Bournemouth':'AFC Bournemouth','Brighton':'Brighton & Hove Albion',
  'Brighton and Hove Albion':'Brighton & Hove Albion','Coventry':'Coventry City',
  'Hull':'Hull City','Ipswich':'Ipswich Town','Leeds':'Leeds United',
  'Man City':'Manchester City','Man United':'Manchester United',
  'Man Utd':'Manchester United','Newcastle':'Newcastle United',
  'Nottm Forest':'Nottingham Forest','Nottingham':'Nottingham Forest',
  'Spurs':'Tottenham Hotspur','Tottenham':'Tottenham Hotspur',
  'Hull City AFC':'Hull City','Ipswich Town FC':'Ipswich Town',
  'Brighton & Hove Albion FC':'Brighton & Hove Albion',
  'Wolverhampton':'Wolverhampton Wanderers',
 });
export const ALLOWED_SHADOW = new Set([
  'late_winner','comeback','first_half_dominance','second_half_collapse',
  'set_piece_reliance','clean_sheet_streak','defensive_errors','finishing_gap',
  'territory_without_chances','keeper_decisive','congestion_fatigue','other',
]);
export const REFUSAL_CODES = new Set([
  'tactical_mechanism','unobservable_state','unlicensed_context',
  'forward_looking','player_inference',
]);
export const COUNTED_FIELDS = new Set([
  'home_goals','away_goals','goals','scorer','assists','yellow_cards','red_cards',
  'substitutions','shots','shots_on_target','blocked_shots','corners','fouls',
  'offsides','saves','possession',
]);
export const ESTIMATE_FIELDS = new Set(['xg','xt','win_probability','shot_quality','rating']);
export const STAT_FIELDS = new Map([
  ['shots','shots'],['total shots','shots'],['shots on target','shots_on_target'],
  ['blocked shots','blocked_shots'],['corners','corners'],['corner kicks','corners'],
  ['fouls','fouls'],['fouls committed','fouls'],['offsides','offsides'],
  ['saves','saves'],['goalkeeper saves','saves'],['ball possession','possession'],
  ['possession','possession'],['yellow cards','yellow_cards'],['red cards','red_cards'],
  ['expected goals (xg)','xg'],['expected goals','xg'],['xg','xg'],
]);
const SHADOW_REGEX = [
  ['late_winner', /\b(?:late winner|last.gasp winner|stoppage.time winner)\b/i],
  ['comeback', /\b(?:came from behind|come from behind|completed a comeback|fought back from)\b/i],
  ['first_half_dominance',/\b(?:dominated the first half|first.half dominance)\b/i],
  ['second_half_collapse',/\b(?:second.half collapse|collapsed after the break)\b/i],
  ['set_piece_reliance',/\b(?:reliant on set pieces|set.piece reliance)\b/i],
  ['clean_sheet_streak',/\b(?:consecutive clean sheets|clean.sheet streak)\b/i],
  ['defensive_errors',/\b(?:defensive errors|defensive mistakes|costly defensive error)\b/i],
  ['finishing_gap',/\b(?:wasted chances|profligate in front of goal|squandered chances)\b/i],
  ['territory_without_chances',/\b(?:possession without chances|territory without chances)\b/i],
  ['keeper_decisive',/\b(?:goalkeeper proved decisive|keeper was decisive)\b/i],
  ['congestion_fatigue',/\b(?:fixture congestion|congested schedule)\b/i],
];
const REFUSAL_REGEX = [
  ['unlicensed_context',/\b(?:injur(?:y|ies|ed)|suspensions?|transfers?|ownership|finances?|wages|takeover)\b/i],
  ['forward_looking',/\b(?:will (?:win|lose|draw|finish|struggle)|next match|upcoming fixture|relegation odds|prediction for|expected to win next)\b/i],
  ['tactical_mechanism',/\b(?:pressing triggers?|pressing shape|rest defence|rest defense|rotations|spacing|formation shifts|overloads|counter.press|high defensive line)\b/i],
  ['unobservable_state',/\b(?:dressing.room mood|confidence|leadership|lack of effort|manager wanted to|manager intended|mental toughness|attitude)\b/i],
  ['player_inference',/\b(?:player.form|player mentality|striker's form|midfielder's form|player looks (?:lost|confident|sharp|tired)|individual brilliance)\b/i],
];

export function canonicalTeam(raw, known = CLUBS_2026) {
  if (typeof raw !== 'string') return null;
  const name=raw.trim();
  const club=known.includes(name) ? name : ALIASES[name] ?? (name.endsWith(' FC') ? name.slice(0,-3) : null);
  return known.includes(club) ? club : null;
}
export function toLondonDate(timestamp) {
  if (!(timestamp instanceof Date) && (typeof timestamp !== 'string' || !timestamp)) return null;
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return null;
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
  const get=t=>parts.find(x=>x.type===t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function daysForRun(now = new Date(), manualEnd) {
  const end = manualEnd || toLondonDate(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) throw new Error('Bad calendar date');
  const d = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0,10)!==end) throw new Error('Invalid date');
  if (!manualEnd) d.setUTCDate(d.getUTCDate()-1);
  const dates=[];
  for(let i=2;i>=0;i--) {
    const x = new Date(d);x.setUTCDate(d.getUTCDate()-i);dates.push(x.toISOString().slice(0,10));
  }
  return dates;
}
export function matchKey(f) { return `${f.date}|${f.home}|${f.away}`; }
export function fixtureFromFotmob(raw, requestedDate, known=CLUBS_2026) {
  if (!raw || typeof raw!=='object') return {error:'fixture_missing'};
  const home=canonicalTeam(raw.home?.longName || raw.home?.name,known);
  const away=canonicalTeam(raw.away?.longName || raw.away?.name,known);
  if (!home || !away || home===away) return {error:'team_unresolved'};
  const date=toLondonDate(raw.status?.utcTime || raw.timeTS || '');
  if(date!==requestedDate) return {error:'date_mismatch'};
  if(raw.status?.finished!==true) return {error:'not_final'};
  const a=raw.home?.score,b=raw.away?.score;
  if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0) return {error:'score_missing'};
  return {date,home,away,score:`${a}-${b}`,provider_id:raw.id,
    provider_url:`https://www.fotmob.com/matches/id/${raw.id}`};
}
export function leagueFixtures(payload,date,known=CLUBS_2026){
  if(!Array.isArray(payload?.leagues)) throw new Error('Invalid FotMob match-list schema');
  const leagues=payload.leagues.filter(l=>l.id===47||l.primaryId===47 || (l.name==='Premier League' && l.ccode==='ENG'));
  if(!leagues.length) throw new Error('Premier League section absent, cannot prove empty date');
  const out=[];const rejected=[];
  for(const raw of leagues.flatMap(l=>l.matches??[])){
    const x=fixtureFromFotmob(raw,date,known);
    if(x.error){if(x.error!=='not_final' && x.error!=='date_mismatch') rejected.push({item:`fotmob:${date}:${raw.id??'unknown'}`,reason:x.error});continue;}
    out.push(x);
  }
  return {matches:out,rejected};
}
export function itemId(match,domain,ordinal) {
  return `${match.date}|${match.home}|${match.away}|${domain}|${String(ordinal).padStart(4,'0')}`;
}
export function hashText(text) {return createHash('sha256').update(text).digest('hex');}
export function ledgerItem(match,domain,ordinal,payload){
  return {id:itemId(match,domain,ordinal),match:matchKey(match),domain,...payload};
}
export function classifyText(item,match){
  const t=String(item.text??'').trim();
  if(!t) return {bucket:'rejected',reason:'empty_text'};
  const refused=REFUSAL_REGEX.find(([,re])=>re.test(t));
  if(refused) return {bucket:'refused',value:{match:matchKey(match),reason:refused[0],quote:t.slice(0,200),source_item:item.id}};
  const shadow=SHADOW_REGEX.find(([,re])=>re.test(t));
  if(shadow){
    const phrase=t.match(shadow[1])?.[0];
    const h=t.toLowerCase().includes(match.home.toLowerCase());
    const a=t.toLowerCase().includes(match.away.toLowerCase());
    let subject=h&&!a?match.home:a&&!h?match.away:null;
    if(!subject){
      const first=match.home.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const second=match.away.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      if(new RegExp(`^${first}\\b`, 'i').test(t))subject=match.home;
      else if(new RegExp(`^${second}\\b`, 'i').test(t))subject=match.away;
      else if(/\bPremier League\b/i.test(t))subject='Premier League';
      else return {bucket:'rejected',reason:'subject_ambiguous'};
    }
    return {bucket:'shadow_signals',value:{match:matchKey(match),subject,
      subject_kind:subject==='Premier League'?'competition':'team',angle:shadow[0],
      domains:[item.domain],confidence:'low',quote:phrase,source_item:item.id}};
  }
  return {bucket:'rejected',reason:'no_licensed_claim'};
}
export function parseStats(detail,match){
  const raw=[];const s=detail?.content?.stats?.Periods?.All;
  if(!s || !Array.isArray(s.stats)) return {raw,errors:['match_stats_unavailable']};
  let n=0;
  for(const group of s.stats){
    for(const stat of group.stats??[]){
      const label=String(stat.title??'').trim().toLowerCase();
      const field=STAT_FIELDS.get(label);
      if(!field) continue;
      const sides=stat.stats;
      if(!Array.isArray(sides)||sides.length!==2) continue;
      for(let j=0;j<2;j++){
        const v=typeof sides[j]==='number'?String(sides[j]):String(sides[j]??'').trim();
        if(!/^(?:\d+(?:\.\d+)?%?)$/.test(v)) continue;
        const numeric=v.endsWith('%')?v:Number(v);
        const side=j===0?'home':'away';
        raw.push(ledgerItem(match,'fotmob.com',++n,{
          kind:field==='xg'?'estimate':'counted',field,value:numeric,side,
          model:field==='xg'?null:undefined,
          text:`${stat.title}: ${v}`,source_url:`https://www.fotmob.com/api/matchDetails?matchId=${match.provider_id}`,
          provenance:'match_center',
        }));
      }
    }
  }
  return {raw,errors:[]};
}
export function normalize(fixtures,rawItems,initialRejected=[],metadata={}){
  const rejected=[...initialRejected];
  const knownKeys=new Set(fixtures.map(matchKey));
  const seenIds=new Set();
  const grouped=new Map(fixtures.map(f=>[matchKey(f),{
    date:f.date,home:f.home,away:f.away,score:f.score,
    counted:[],estimates:[],derived:[],shadow_signals:[],refused:[],
  }]));
  const snapshot=new Map();
  function refuseItem(item,reason){rejected.push({item:item.id,reason});}
  for(const item of rawItems){
    if(!item.id || seenIds.has(item.id)){rejected.push({item:item.id??'unknown',reason:'duplicate_source_item'});continue;}
    seenIds.add(item.id);
    if(!knownKeys.has(item.match)){refuseItem(item,'match_unresolved');continue;}
    const m=grouped.get(item.match);
    if(item.kind==='counted' && COUNTED_FIELDS.has(item.field) && ['home','away'].includes(item.side) && item.value!==null && item.value!==undefined){
      const key=`${item.match}|${item.field}|${item.side}`;
      if(!snapshot.has(key)) snapshot.set(key,[]);
      snapshot.get(key).push(item);
      m.counted.push({match:item.match,field:item.field,value:item.value,side:item.side,source_item:item.id});
    }else if(item.kind==='estimate' && ESTIMATE_FIELDS.has(item.field)){
      if(!item.model){refuseItem(item,'model_unnamed');continue;}
      m.estimates.push({match:item.match,field:item.field,value:item.value,side:item.side,model:item.model,source_item:item.id});
    }else if(item.kind==='text'){
      const x=classifyText(item,m);
      if(x.bucket==='rejected') refuseItem(item,x.reason);
      else m[x.bucket].push(x.value);
    }else refuseItem(item,'unsupported_raw_item');
  }
  // Reject ALL conflicting counted source claims (even if repeated across multiple sources).
  for(const items of snapshot.values()){
    const values=new Set(items.map(x=>JSON.stringify(x.value)));
    if(values.size<2)continue;
    for(const item of items){
      const m=grouped.get(item.match);
      m.counted=m.counted.filter(x=>x.source_item!==item.id);
      rejected.push({item:item.id,reason:'sources_disagree',value:item.value});
    }
  }
  const matches=[...grouped.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.home.localeCompare(b.home));
  const tally={matches:matches.length,counted:0,estimates:0,derived:0,shadow:0,refused:0,rejected:rejected.length};
  for(const m of matches){tally.counted+=m.counted.length;tally.estimates+=m.estimates.length;
    tally.derived+=m.derived.length;tally.shadow+=m.shadow_signals.length;tally.refused+=m.refused.length;}
  const output={window:metadata.window||'',matches,rejected,tally};
  if(metadata.evidence_manifest)output.evidence_manifest=metadata.evidence_manifest;
  if(metadata.run_status)output.run_status=metadata.run_status;
  if(metadata.run_errors)output.run_errors=metadata.run_errors;
  validate(output,rawItems);
  return output;
}
export function validate(output,raw){
  const rawIds=new Set(raw.map(x=>x.id));
  const used=new Set();
  let totals={matches:output.matches.length,counted:0,estimates:0,derived:0,shadow:0,refused:0,rejected:output.rejected.length};
  for(const m of output.matches){
    if(!CLUBS_2026.includes(m.home)||!CLUBS_2026.includes(m.away)||!/^\d+-\d+$/.test(m.score))throw Error('Invalid canonical fixture');
    for(const [bucket,key] of [['counted','counted'],['estimates','estimates'],['derived','derived'],['shadow_signals','shadow'],['refused','refused']]){
      totals[key]+=m[bucket].length;
      for(const x of m[bucket]){
        if(bucket==='derived'){
          if(!x.formula||!x.inputs?.every(id=>m.counted.some(y=>y.source_item===id)))throw Error('Unlicensed derived formula');
          continue;
        }
        if(!rawIds.has(x.source_item))throw Error(`Missing raw source: ${x.source_item}`);
        if(used.has(x.source_item))throw Error(`Source double classified: ${x.source_item}`);
        used.add(x.source_item);
        if(bucket==='estimates' && !x.model)throw Error('Unnamed model');
        if(bucket==='shadow_signals' && (!ALLOWED_SHADOW.has(x.angle)||!['team','competition'].includes(x.subject_kind)))throw Error('Bad shadow');
        if(bucket==='refused' && !REFUSAL_CODES.has(x.reason))throw Error('Bad refusal');
      }
    }
  }
  for(const x of output.rejected){
    if(!x.reason)throw Error('Rejection missing reason');
    if(rawIds.has(x.item)){
      if(used.has(x.item))throw Error('Rejected source also classified');
      used.add(x.item);
    }
  }
  for(const id of rawIds)if(!used.has(id))throw Error(`Unaccounted raw item: ${id}`);
  for(const [k,v] of Object.entries(totals))if(output.tally[k]!==v)throw Error(`Tally mismatch: ${k}`);
  return true;
}