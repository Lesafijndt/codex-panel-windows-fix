import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
const base=path.dirname(fileURLToPath(import.meta.url));
const upstream=process.env.PANEL_UPSTREAM;
assert.ok(upstream,'Set PANEL_UPSTREAM to the installed version 0.5.1 plugin directory');
const config=process.argv[2];
assert.ok(config,'Pass a local panel configuration path as the first argument');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const baselineConfig=hash(config), runtime=path.join(base,'server/.upstream-runtime.mjs');
fs.writeFileSync(runtime,fs.readFileSync(path.join(upstream,'server/panel.mjs'),'utf8')+'\nexport {eo,ar};\n');
let failure;
try {
  const {eo,ar}=await import(pathToFileURL(runtime));
  const controller=new ar({config:eo(config),leadCli:path.join(base,'server/lead.mjs')});
  try {await controller.snapshot();}catch(error){failure={code:error.code,message:error.message};}finally{controller.close();}
}finally{fs.unlinkSync(runtime);}
assert.equal(failure?.code,'state_unreadable');
assert.equal(hash(config),baselineConfig);
const files=[];
for(const dir of ['server','assets'])for(const relative of fs.readdirSync(path.join(base,dir),{recursive:true})){
  const local=path.join(base,dir,relative), original=path.join(upstream,dir,relative);
  if(!fs.statSync(local).isFile())continue;
  const same=hash(local)===hash(original);
  assert.equal(same,!(dir==='server'&&relative==='panel.mjs'));
  files.push({file:path.join(dir,relative),upstreamSha256:hash(original),localSha256:hash(local),unchanged:same});
}
const report={upstreamVersion:'0.5.1',originalFailure:failure,configSha256:baselineConfig,configUnchanged:true,files};
fs.writeFileSync(path.join(base,'provenance.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({originalFailure:failure,configUnchanged:true,onlyChangedRuntimeFile:'server/panel.mjs',filesVerified:files.length},null,2));
