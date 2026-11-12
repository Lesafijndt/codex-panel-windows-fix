import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
const base=path.dirname(fileURLToPath(import.meta.url));
const url=new URL(fs.readFileSync(path.join(base,'server.stdout.log'),'utf8').match(/http:\/\/127\.0\.0\.1:\d+\/#token=[a-f0-9]+/)[0]);
const token=url.hash.slice('#token='.length);
const authorization=`Bearer ${token}`;
const checks=[];
for(const [name,route,headers,status] of [
  ['HTML loads','/',{},200],
  ['UI module loads','/assets/panel.mjs',{},200],
  ['Snapshot requires token','/api/state',{},401],
  ['Foreign origin rejected','/api/state',{authorization,origin:'https://example.invalid'},403],
  ['Authenticated snapshot','/api/state',{authorization},200]
]) {
  const response=await fetch(new URL(route,url),{headers});
  assert.equal(response.status,status,name);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.match(response.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  if(name==='Authenticated snapshot'){
    const snapshot=await response.json();
    assert.equal(snapshot.ok,true);
  const expectedSessions=(process.env.PANEL_EXPECTED_SESSION_IDS||'').split(',').filter(Boolean);
  assert.ok(expectedSessions.length>0,'Set PANEL_EXPECTED_SESSION_IDS to the expected local registered session IDs');
  for(const id of expectedSessions)assert.ok(snapshot.runs.some(run=>run.id===id));
    fs.writeFileSync(path.join(base,'http-snapshot.json'),JSON.stringify(snapshot,null,2));
  }
  checks.push({name,status,result:'pass'});
}
// fetch normalizes Host, so use node:http to send the deliberately foreign Host.
const foreignHost=await new Promise((resolve,reject)=>{
  const request=http.get(new URL('/api/state',url),{headers:{authorization,host:'example.invalid'}},response=>{response.resume();response.on('end',()=>resolve(response.statusCode));});
  request.on('error',reject);
});
assert.equal(foreignHost,403);
checks.push({name:'Foreign host rejected (raw HTTP Host)',status:foreignHost,result:'pass'});
const report={url:url.origin,checks,decisionsSubmitted:0,feedbackSubmitted:0,modelsLaunched:0};
fs.writeFileSync(path.join(base,'http-verification.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
