import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(directory, 'server/panel.mjs');
let source = fs.readFileSync(file, 'utf8');
const original = 'function tn(t){if(typeof t!="string"||!t.startsWith("/"))return null;let e=[];for(let n of t.split("/"))if(!(n===""||n===".")){if(n===".."){if(e.length===0)return null;e.pop();continue}e.push(n)}return`/${e.join("/")}`}function Wn(t,e){let n=tn(t),o=tn(e);return n===null||o===null?!1:o===n||o.startsWith(n==="/"?"/":`${n}/`)}';

// Keep canonical Windows paths in native form: callers compare them exactly
// with realpathSync() and path.join(). Do not case-fold: NTFS can be sensitive.
// Reject ambiguous Windows aliases (device/UNC/drive-relative/ADS) fail-closed.
const replacement = String.raw`function tn(t){
  if(typeof t!=="string"||t.includes("\0"))return null;
  const windows=/^[A-Za-z]:[\\/]/.test(t);
  if(!windows&&(!t.startsWith("/")||t.startsWith("//")))return null;
  const separator=windows?"\\":"/", root=windows?t.slice(0,2)+separator:"/";
  const components=windows?t.slice(3).split(/[\\/]/):t.split("/");
  const parts=[];
  for(const part of components){
    if(part===""||part===".")continue;
    if(part===".."){if(parts.length===0)return null;parts.pop();continue;}
    if(windows&&(/[<>:"|?*\x00-\x1f]/.test(part)||/[. ]$/.test(part)||/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part)))return null;
    parts.push(part);
  }
  return root+parts.join(separator);
}
function Wn(t,e){
  const root=tn(t), candidate=tn(e);
  if(root===null||candidate===null)return false;
  const separator=/^[A-Za-z]:\\/.test(root)?"\\":"/";
  return candidate===root||candidate.startsWith(root.endsWith(separator)?root:root+separator);
}`;
if (source.split(original).length !== 2) throw new Error('Expected exactly one upstream path helper pair; refusing unknown bundle');
source = source.replace(original, replacement);
fs.writeFileSync(file, source);
console.log('Patched only tn()/Wn() in workspace-local panel bundle.');
