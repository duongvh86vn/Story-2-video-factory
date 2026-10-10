import {promises as fs,constants} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export type ArtActor='lila'|'karo';
const folders=['head-cells','head-face-plates','head-source-studies','body-views','pose-studies'] as const;
const maxBytes=40*1024*1024;

// Authoring inventory only. File names, hashes and presence cannot approve art,
// register a pose/view or substitute for the production capability registry.
async function inspect(root:string,file:string){
  let cursor=root;
  const checked=[];
  for(const part of file.split('/')){
    cursor=path.join(cursor,part);const stat=await fs.lstat(cursor);
    if(stat.isSymbolicLink())throw new Error('Linked art catalog source');
    checked.push({file:cursor,stat});
  }
  const before=checked.at(-1)!.stat;
  if(!before.isFile()||before.size>maxBytes)throw new Error('Invalid art catalog source');
  const handle=await fs.open(cursor,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
  try{
    const opened=await handle.stat();
    if(!opened.isFile()||opened.dev!==before.dev||opened.ino!==before.ino||opened.size>maxBytes)throw new Error('Changed art catalog source');
    for(const entry of checked){const now=await fs.lstat(entry.file);if(now.isSymbolicLink()||now.dev!==entry.stat.dev||now.ino!==entry.stat.ino)throw new Error('Changed art catalog path');}
    const bytes=await handle.readFile();if(bytes.length>maxBytes)throw new Error('Oversized art catalog source');
    return {file,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
  }finally{await handle.close();}
}

export async function existingActorArt(root:string,actor:ArtActor){
  if(actor!=='lila'&&actor!=='karo')throw new Error('Unknown art actor');
  const entries=[{kind:'primary-reference',...await inspect(root,`docs/topics/assets/reference-${actor}-full.png`)}];
  for(const folder of folders){
    const relative=`library/topics/prehistoric-life/${folder}`;let cursor=root,missing=false;
    for(const part of relative.split('/')){
      cursor=path.join(cursor,part);
      try{const stat=await fs.lstat(cursor);if(stat.isSymbolicLink()||!stat.isDirectory())throw new Error('Linked/invalid art catalog folder');}
      catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;missing=true;break;}
    }
    if(missing)continue;
    const files=await fs.readdir(cursor,{withFileTypes:true});if(files.length>4096)throw new Error('Oversized art catalog folder');
    for(const entry of files.sort((a,b)=>a.name.localeCompare(b.name))){
      // Mask/reference boards are derivatives, not interchangeable character art.
      if(!entry.name.startsWith(actor+'-')||!/^[-a-z0-9]+\.(?:png|jpg|webp)$/.test(entry.name)||/(?:-mask|-reference)\./.test(entry.name))continue;
      if(!entry.isFile()||entry.isSymbolicLink())throw new Error('Invalid art catalog entry');
      entries.push({kind:folder,...await inspect(root,`${relative}/${entry.name}`)});
    }
  }
  return {version:'actor-art-reuse-1',actor,scope:'authoring-inventory-only',entries,
    uniqueImages:new Set(entries.map(e=>e.sha256)).size,productionReady:false,
    selection:'Use the existing file path and SHA; do not regenerate or copy it for each pose, shot or story. Identity/view/rig approval is a separate requirement.'};
}

export function newArtReason(generate:boolean,reason:string|undefined){
  if(!generate)throw new Error('New artwork requires --generate; default is the existing asset catalog');
  const value=reason?.trim();
  if(!value||value.length<16||value.length>2000)throw new Error('Provide --new-art-reason (16–2000 characters) describing the missing asset or specific defect after checking existing art');
  return reason!;
}
