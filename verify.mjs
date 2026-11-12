import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const base = path.dirname(fileURLToPath(import.meta.url));
const testable = path.join(base, 'server/.test-runtime.mjs');
fs.writeFileSync(testable, fs.readFileSync(path.join(base, 'server/panel.mjs'), 'utf8') + '\nexport {tn,Wn,rn,Kt,eo,ar};\n');
const checks=[];
const test=(name,fn)=>{fn();checks.push({name,result:'pass'});};
try {
  const {tn,Wn,rn,Kt,eo,ar}=await import(pathToFileURL(testable));
  test('POSIX normalization and root handling',()=>{
    assert.equal(tn('/root/a/../b'),'/root/b');
    assert.equal(tn('/'),'/');
    assert.equal(Wn('/','/root/file'),true);
    assert.equal(Wn('/root','/root/a'),true);
  });
  test('Windows native canonical format and mixed separators',()=>{
    assert.equal(tn('C:/root/a/../b'),'C:\\root\\b');
    assert.equal(tn('C:\\root\\a/./b'),'C:\\root\\a\\b');
    assert.equal(Wn('C:\\','C:\\root'),true);
    assert.equal(Wn('C:/root','C:\\root\\a'),true);
  });
  test('POSIX and Windows traversal and sibling boundaries',()=>{
    for(const [root,file] of [['/root','/root-other/file'],['/root','/root/../secret'],['C:/root','C:/root-other/file'],['C:/root','C:/root/../secret'],['C:/root','D:/root/file'],['C:/Root','C:/root/file']]) assert.equal(Wn(root,file),false);
    for(const file of ['/../secret','C:/../secret','relative','C:relative','\\\\server\\share\\file','//server/share/file','\\\\?\\C:\\file','C:/root/file:stream','C:/root/alias.','C:/root/NUL','C:/root/file\0']) assert.equal(tn(file),null,file);
  });
  const fixture=fs.mkdtempSync(path.join(base,'fixture-'));
  const root=path.join(fixture,'root'), sibling=path.join(fixture,'root-other');
  fs.mkdirSync(root);fs.mkdirSync(sibling);
  const file=path.join(root,'data.txt'), secret=path.join(sibling,'secret.txt');
  fs.writeFileSync(file,'allowed');fs.writeFileSync(secret,'outside');
  const canonical=fs.realpathSync(file), canonicalRoot=fs.realpathSync(root);
  test('Real descriptor reader accepts canonical Windows file',()=>{
    assert.equal(rn(file),canonical);
    assert.equal(Kt([canonicalRoot],file,{exact:canonical}).data.toString(),'allowed');
  });
  test('Real descriptor reader rejects sibling and traversal escape',()=>{
    for(const target of [secret,path.join(root,'..','root-other','secret.txt')])assert.throws(()=>Kt([canonicalRoot],target),e=>e.code==='outside_roots');
  });
  test('Real descriptor reader enforces file type and size',()=>{
    assert.throws(()=>Kt([canonicalRoot],root),e=>['artifact_unreadable'].includes(e.code));
    assert.throws(()=>Kt([canonicalRoot],file,{maxBytes:2}),e=>e.code==='artifact_too_large');
  });
  // Junctions are Windows directory symlinks and require no developer-mode privilege.
  const escape=path.join(root,'escape'), internal=path.join(root,'alias');
  fs.symlinkSync(sibling,escape,process.platform==='win32'?'junction':'dir');
  fs.symlinkSync(root,internal,process.platform==='win32'?'junction':'dir');
  test('Real reader rejects outside-root junction/symlink',()=>assert.throws(()=>Kt([canonicalRoot],path.join(escape,'secret.txt')),(e)=>e.code==='outside_roots'));
  test('Registered exact path rejects in-root junction/symlink replacement',()=>assert.throws(()=>Kt([canonicalRoot],path.join(internal,'data.txt'),{exact:path.join(internal,'data.txt')}),(e)=>e.code==='path_changed'));
  // Read-only snapshot uses the same actual controller as HTTP; no decisions or feedback.
  const configFile=process.argv[2];
  const config=eo(configFile);
  assert.equal(config.launch.enabled,false);
  const controller=new ar({config,leadCli:path.join(base,'server/lead.mjs')});
  let snapshot;
  try {snapshot=await controller.snapshot();} finally {controller.close();}
  const expectedSessions=(process.env.PANEL_EXPECTED_SESSION_IDS||'').split(',').filter(Boolean);
  assert.ok(expectedSessions.length>0,'Set PANEL_EXPECTED_SESSION_IDS to the expected local registered session IDs');
  for(const id of expectedSessions)assert.ok(snapshot.runs.some(run=>run.id===id));
  fs.writeFileSync(path.join(base,'snapshot.json'),JSON.stringify(snapshot,null,2));
  checks.push({name:'Actual registered host and builder appear in read-only controller snapshot',result:'pass'});
  const report={platform:process.platform,node:process.version,checks,fixture,snapshot:{runs:snapshot.runs.map(r=>({id:r.id,label:r.label,state:r.state})),reviews:snapshot.reviews.length,launchEnabled:config.launch.enabled},limitations:['Windows junction checks executed; POSIX path semantics checked on Windows, not a POSIX filesystem.','UNC and device paths intentionally fail closed; this configuration uses drive-letter paths.']};
  fs.writeFileSync(path.join(base,'verification.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
} finally {
  fs.unlinkSync(testable);
}
