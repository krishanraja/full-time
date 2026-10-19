import test from 'node:test';
import assert from 'node:assert/strict';
import { requestJson } from '../scripts/pl-evidence/collect.mjs';
import { espnFixtures } from '../scripts/pl-evidence/core.mjs';

// Real external provider smoke check. This was added after the first live
// scheduled run exposed an unavailable FotMob endpoint despite green mocks.
// Check one already-completed historical Premier League match date only.
test('ESPN live scoreboard can enumerate finished Premier League fixtures', {timeout: 25000}, async()=>{
  const date='2026-08-22';
  const url='https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20260822';
  const payload=await requestJson(url,{timeoutMs:9000,attempts:2});
  const fixtures=espnFixtures(payload,date);
  assert.ok(fixtures.matches.length>=1,'ESPN feed returned no completed Premier League fixtures on a known match day');
  for(const f of fixtures.matches){
    assert.equal(f.date,date);
    assert.equal(f.source_domain,'espn.com');
    assert.match(f.score,/^\\d+-\\d+$/);
  }
});
