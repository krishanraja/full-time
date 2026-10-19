import { DOMAINS, leagueFixtures, espnFixtures, ledgerItem, parseStats, parseEspnStats, matchKey, canonicalTeam, toLondonDate } from './core.mjs';

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
  const matches=[];const rejected=[];const errors=[];const source_status=[];
  for(const date of dates){
    const fotmobUrl=`https://www.fotmob.com/api/matches?date=${date.replaceAll('-','')}`;
    try{
      const x=leagueFixtures(await req(fotmobUrl),date);
      matches.push(...x.matches.map(m=>({...m,source_domain:'fotmob.com',fixture_source_url:fotmobUrl})));
      rejected.push(...x.rejected);
      source_status.push({date,domain:'fotmob.com',url:fotmobUrl,status:'found',count:x.matches.length});
    }catch(error){
      source_status.push({date,domain:'fotmob.com',url:fotmobUrl,status:'error',error:String(error.message).slice(0,120)});
      // ESPN scoreboard is independent of FotMob and has an explicit FT marker.
      // It is an auxiliary fixture/match-centre source, not an editorial domain.
      const espnUrl=`https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=${date.replaceAll('-','')}`;
      try{
        const x=espnFixtures(await req(espnUrl),date);
        matches.push(...x.matches);
        rejected.push(...x.rejected);
        source_status.push({date,domain:'espn.com',url:espnUrl,status:'found',count:x.matches.length,fallback_for:'fotmob.com'});
      }catch(fallbackError){
        errors.push(`fixture ${date}: FotMob ${error.message}; ESPN fallback ${fallbackError.message}`);
        source_status.push({date,domain:'espn.com',url:espnUrl,status:'error',error:String(fallbackError.message).slice(0,120)});
      }
    }
  }
  // football-data.org crosscheck is a metadata verification, not a classified non-API source.
  // A disagreement is rejected rather than resolved or overruled.
  let independent_check='unavailable';
  if(footballDataKey){
    try{
      const url=`https://api.football-data.org/v4/competitions/PL/matches?dateFrom=${dates[0]}&dateTo=${dates.at(-1)}`;
      const data=await req(url,{headers:{'X-Auth-Token':footballDataKey}});
      if(!Array.isArray(data.matches))throw Error('Invalid football-data result schema');
      const fdata=data.matches.filter(x=>x.status==='FINISHED');
      // A fixture missing from the discovered set is a coverage failure,
      // never evidence that the match was not played.
      for(const item of fdata){
        const home=canonicalTeam(item.homeTeam?.name) ?? canonicalTeam(item.homeTeam?.shortName);
        const away=canonicalTeam(item.awayTeam?.name) ?? canonicalTeam(item.awayTeam?.shortName);
        const date=toLondonDate(item.utcDate);
        if(date && dates.includes(date) && home && away &&
          !matches.some(m=>m.date===date && m.home===home && m.away===away)){
          errors.push(`fixture absent from primary discovery: ${date}|${home}|${away}`);
        }
      }
      const accepted=[];
      for(const match of matches){
        const others=fdata.filter(x=>{
          const home=canonicalTeam(x.homeTeam?.name) ?? canonicalTeam(x.homeTeam?.shortName);
          const away=canonicalTeam(x.awayTeam?.name) ?? canonicalTeam(x.awayTeam?.shortName);
          return toLondonDate(x.utcDate)===match.date && home===match.home && away===match.away;
        });
        if(others.length!==1){
          errors.push(`independent score unverified for ${matchKey(match)}`);
          accepted.push(match);
          continue;
        }
        const h=others[0].score?.fullTime?.home,a=others[0].score?.fullTime?.away;
        if(!Number.isInteger(h)||!Number.isInteger(a)){errors.push(`independent score missing for ${matchKey(match)}`);accepted.push(match);continue;}
        const otherScore=`${h}-${a}`;
        if(otherScore!==match.score){
          rejected.push({item:`fotmob:${matchKey(match)}=${match.score}`,reason:'sources_disagree'});
          rejected.push({item:`football-data.org:${matchKey(match)}=${otherScore}`,reason:'sources_disagree'});
        }else accepted.push(match);
      }
      matches.length=0;matches.push(...accepted.filter(m=>!rejected.some(r=>r.reason==='sources_disagree' && r.item.includes(matchKey(m)))));
      independent_check='attempted';
    }catch(error){errors.push(`independent check unavailable: ${error.message}`);}
  }else errors.push('FOOTBALL_DATA_KEY not set; independent fixture/score reconciliation unavailable');
  const ids=new Set();
  for(const m of [...matches]){
    if(ids.has(matchKey(m))){rejected.push({item:`fotmob:${matchKey(m)}`,reason:'duplicate_fixture'});matches.splice(matches.indexOf(m),1);}
    ids.add(matchKey(m));
  }
  return {matches,rejected,errors,source_status,independent_check};
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