import { DOMAINS, leagueFixtures, espnFixtures, footballDataFixtures, ledgerItem, parseStats, parseEspnStats, matchKey, canonicalTeam, toLondonDate } from './core.mjs';

const AGENT='FullTimeEvidenceResearch/1.0 (+https://fulltime.fm; public match evidence only)';
export async function requestText(url,{headers={},timeoutMs=8500,attempts=2}={}){
  const u=new URL(url);
  if(u.protocol!=='https:')throw Error('HTTPS required');
  let last;
  for(let attempt=0;attempt<attempts;attempt++){
    try{
      const r=await fetch(url,{headers:{'User-Agent':AGENT,'Accept':'application/json, application/rss+xml, text/xml, text/html;q=0.9',...headers},signal:AbortSignal.timeout(timeoutMs),redirect:'follow'});
      if(!r.ok)throw Error(`HTTP ${r.status}`);
      const length=Number(r.headers.get('content-length')||'0');
      if(length>3_000_000)throw Error('Response over 3MB limit');
      const content=await r.text();
      if(content.length>3_000_000)throw Error('Response over 3MB limit');
      return content;
    }catch(e){last=e;if(attempt+1<attempts)await new Promise(resolve=>setTimeout(resolve,400*(attempt+1)));}
  }
  throw last;
}
export async function requestJson(url,opt={}){return JSON.parse(await requestText(url,opt));}
export async function discoverFixtures(dates,{footballDataKey,req=requestJson}={}){
  const matches=[],rejected=[],errors=[],source_status=[];
  const fdataUrl=`https://api.football-data.org/v4/competitions/PL/matches?dateFrom=${dates[0]}&dateTo=${dates.at(-1)}`;
  let verified=null;
  if(footballDataKey){
    try{
      verified=footballDataFixtures(await req(fdataUrl,{headers:{'X-Auth-Token':footballDataKey}}),dates);
      rejected.push(...verified.rejected);
      source_status.push({domain:'football-data.org',url:fdataUrl,status:'found',count:verified.matches.length});
    }catch(error){
      errors.push(`football-data fixture feed: ${error.message}`);
      source_status.push({domain:'football-data.org',url:fdataUrl,status:'error',error:String(error.message).slice(0,120)});
    }
  }else errors.push('FOOTBALL_DATA_KEY not set; independent fixture/score reconciliation unavailable');

  for(const date of dates){
    const fotmobUrl=`https://www.fotmob.com/api/matches?date=${date.replaceAll('-','')}`;
    let found=false;
    try{
      const x=leagueFixtures(await req(fotmobUrl),date);
      matches.push(...x.matches.map(m=>({...m,source_domain:'fotmob.com',fixture_source_url:fotmobUrl})));
      rejected.push(...x.rejected);
      source_status.push({date,domain:'fotmob.com',url:fotmobUrl,status:'found',count:x.matches.length});
      found=true;
    }catch(error){
      source_status.push({date,domain:'fotmob.com',url:fotmobUrl,status:'error',error:String(error.message).slice(0,120)});
    }
    if(!found){
      const espnUrl=`https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=${date.replaceAll('-','')}`;
      try{
        const x=espnFixtures(await req(espnUrl),date);
        matches.push(...x.matches);
        rejected.push(...x.rejected);
        source_status.push({date,domain:'espn.com',url:espnUrl,status:'found',count:x.matches.length,fallback_for:'fotmob.com'});
        found=true;
      }catch(error){
        source_status.push({date,domain:'espn.com',url:espnUrl,status:'error',error:String(error.message).slice(0,120)});
      }
    }
    if(!found && !verified)errors.push(`fixture ${date}: all available primary discovery endpoints failed`);
  }

  // An authenticated fixture feed is authoritative for the covered range.
  // Fill only explicit finished fixtures that public feeds could not discover;
  // contradictions are refused, not resolved by preference.
  if(verified){
    const fromAuth=new Map(verified.matches.map(m=>[matchKey(m),m]));
    const accepted=[];
    for(const candidate of matches){
      const key=matchKey(candidate),independent=fromAuth.get(key);
      if(!independent){
        errors.push(`independent score unverified for ${key}`);
        accepted.push(candidate);
        continue;
      }
      if(independent.score!==candidate.score){
        rejected.push({item:`${candidate.source_domain}:${key}=${candidate.score}`,reason:'sources_disagree'});
        rejected.push({item:`football-data.org:${key}=${independent.score}`,reason:'sources_disagree'});
      }else accepted.push(candidate);
    }
    const represented=new Set(matches.map(matchKey));
    for(const match of verified.matches){
      const key=matchKey(match);
      if(!represented.has(key)){
        accepted.push(match);
        errors.push(`single-source finished fixture: ${key}; no independent public result available`);
      }
    }
    matches.push();matches.length=0;matches.push(...accepted);
  }

  const seen=new Set();
  for(let i=matches.length-1;i>=0;i--){
    const key=matchKey(matches[i]);
    if(seen.has(key)){
      rejected.push({item:`${matches[i].source_domain}:${key}`,reason:'duplicate_fixture'});
      matches.splice(i,1);
    }else seen.add(key);
  }
  return {matches,rejected,errors,source_status,
    independent_check:verified?'football-data.org_accessible':'unavailable'};
}

export async function collectMatchDetails(fixtures,{req=requestJson}={}){
  const raw=[];const errors=[];const coverage=[];
  for(const fixture of fixtures){
    const espn=fixture.source_domain==='espn.com';
    const domain=espn?'espn.com':'fotmob.com';
    const url=espn
      ?`https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/summary?event=${fixture.provider_id}`
      :`https://www.fotmob.com/api/matchDetails?matchId=${fixture.provider_id}`;
    try{
      const data=await req(url);
      const stats=espn?parseEspnStats(data,fixture):parseStats(data,fixture);
      raw.push(...stats.raw);
      errors.push(...stats.errors.map(s=>`${matchKey(fixture)}: ${s}`));
      coverage.push({match:matchKey(fixture),domain,url,status:stats.errors.length?'partial':'found',items:stats.raw.length});
    }catch(error){
      errors.push(`${matchKey(fixture)} ${domain} details: ${error.message}`);
      coverage.push({match:matchKey(fixture),domain,url,status:'error',error:String(error.message).slice(0,120)});
    }
  }
  return {raw,errors,coverage};
}
const entities={'amp':'&','quot':'"','apos':"'",'lt':'<','gt':'>','nbsp':' '};
export function decodeXml(text){
  return String(text??'').replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi,(match,e)=>{
    if(e.startsWith('#x'))return String.fromCodePoint(parseInt(e.slice(2),16));
    if(e.startsWith('#'))return String.fromCodePoint(parseInt(e.slice(1),10));
    return entities[e]??match;
  });
}
function xmlTag(blob,tag){
  const match=blob.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,'i'));
  if(!match)return '';
  return decodeXml(match[1].replace(/^<!\[CDATA\[/,'').replace(/\]\]>$/,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
}
export function parseRss(xml){
  const items=[...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)];
  if(!/<rss\b/i.test(xml) && !items.length)throw Error('Not RSS');
  return items.map(m=>({title:xmlTag(m[1],'title'),url:xmlTag(m[1],'link'),description:xmlTag(m[1],'description'),pubDate:xmlTag(m[1],'pubDate')})).filter(x=>x.title&&x.url);
}
export function exactApprovedUrl(url,domain){
  try{
    const u=new URL(url);
    if(u.protocol!=='https:')return false;
    const host=u.hostname.toLowerCase();
    return host===domain || host.endsWith(`.${domain}`);
  }catch{return false;}
}
function teamSearchName(name){return name==='Brighton & Hove Albion'?'Brighton':name==='AFC Bournemouth'?'Bournemouth':name==='Tottenham Hotspur'?'Tottenham':name;}
export function discoverQuery(fixture,domain){
  const q=`site:${domain} "${teamSearchName(fixture.home)}" "${teamSearchName(fixture.away)}" after:${fixture.date}`;
  return `https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss`;
}
function relevance(item,fixture){
  const text=`${item.title} ${item.description}`.toLowerCase();
  const names=[teamSearchName(fixture.home),teamSearchName(fixture.away)].map(x=>x.toLowerCase());
  return names.every(x=>text.includes(x));
}
export async function collectNews(fixtures,{req=requestText,concurrency=6,maxQueries=400}={}){
  const jobs=fixtures.flatMap(m=>DOMAINS.filter(d=>d!=='fotmob.com').map(domain=>({m,domain})));
  const raw=[];const coverage=[];const errors=[];let cursor=0;
  const capped=jobs.slice(0,maxQueries);
  for(const job of jobs.slice(maxQueries))coverage.push({match:matchKey(job.m),domain:job.domain,status:'not_attempted',reason:'query_cap'});
  async function worker(){
    while(cursor<capped.length){
      const {m,domain}=capped[cursor++];const url=discoverQuery(m,domain);
      try{
        const entries=parseRss(await req(url));
        const relevant=entries.filter(x=>exactApprovedUrl(x.url,domain)&&relevance(x,m));
        const unique=[...new Map(relevant.map(x=>[x.url,x])).values()].slice(0,2);
        let n=0;
        for(const entry of unique){
          // RSS metadata is evidence only of the publisher's short headline/description.
          // Full article claims are NEVER inferred from a discovery snippet.
          const date=entry.pubDate?new Date(entry.pubDate):null;
          if(date && !Number.isNaN(date.getTime()) && date < new Date(m.date+'T00:00:00Z'))continue;
          const text=`${entry.title}. ${entry.description}`.slice(0,300);
          raw.push(ledgerItem(m,domain,++n,{kind:'text',text,source_url:entry.url,
            provenance:'rss_snippet',published_at:date&&!Number.isNaN(date.getTime())?date.toISOString():null}));
        }
        coverage.push({match:matchKey(m),domain,url,status:n?'found':'no_relevant_coverage',items:n});
      }catch(error){
        const msg=String(error.message||error);
        coverage.push({match:matchKey(m),domain,url,status:/HTTP 403|HTTP 401/.test(msg)?'blocked':'error',error:msg.slice(0,100)});
        errors.push(`${matchKey(m)} ${domain}: ${msg.slice(0,100)}`);
      }
    }
  }
  await Promise.all(Array.from({length:Math.min(concurrency,capped.length)},()=>worker()));
  return {raw,coverage,errors};
}