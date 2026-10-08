import {promises as fs} from 'node:fs';
import path from 'node:path';
import {hash} from '../core/utils.js';
import {NativeHeadBankDefinitionSchema,nativeHeadBank} from '../animation/native-head-bank.js';
import {nativeHeadResources,readNativeHeadSource,readNativeHeadPrimary} from '../animation/native-head-resources.js';
import {HEAD_FACE_CANDIDATES,HEAD_FACE_VIEWS,type HeadFaceView} from './head-face-candidates.js';

/** Bounded immutable source reads shared by diagnostic consumers. No URLs,
 * symlinks or caller-selected files. Parsing does not approve geometry/art. */
export async function boundedHeadFaceFile(repo:string,file:string,maxBytes:number){
  let target=path.resolve(repo);const parts=file.split('/');
  if(parts.some(p=>!p||p==='.'||p==='..'||p.includes('\\')||p.includes(':')))throw new Error('Invalid face workbench source');
  for(const [i,part] of parts.entries()){
    target=path.join(target,part);const stat=await fs.lstat(target);
    if(stat.isSymbolicLink()||(i===parts.length-1?!stat.isFile()||stat.size>maxBytes:!stat.isDirectory()))throw new Error('Linked/oversized face workbench source');
  }
  const bytes=await fs.readFile(target);if(bytes.length>maxBytes)throw new Error('Oversized face workbench source');return bytes;
}

/** Fixed catalog lookup, with exact actor/view/head/body/resource identity.
 * This invokes registration validation; implementation agents must not call
 * it while geometry/runtime execution is delegated to the user's model. */
export async function headFaceCandidate(repo:string,actor:'lila'|'karo',view:HeadFaceView='three-quarter-right'){
  if(actor!=='lila'&&actor!=='karo'||!HEAD_FACE_VIEWS.includes(view))throw new Error('Invalid face candidate actor/view');
  const entry=HEAD_FACE_CANDIDATES.find(c=>c.actor===actor&&c.view===view);
  if(!entry)throw new Error(`needs-head-face-candidate: ${actor}/${view} has not been authored`);
  const bytes=await boundedHeadFaceFile(repo,entry.file,200*1024),definition=NativeHeadBankDefinitionSchema.parse(JSON.parse(bytes.toString('utf8')));
  if(definition.actor!==actor||definition.id!==entry.id||definition.version!=='native-head-bank-3'||definition.cells.length!==1||definition.cells[0]!.yawDeg!==null||definition.routes.length||
    definition.bodyViews.length!==1||definition.bodyViews[0]!.view!==view||
    definition.source.file!=='library/topics/prehistoric-life/head-cells/'+entry.headFile)throw new Error('Face workbench needs the exact fixed source-angle candidate and compatible body view');
  const bank=nativeHeadBank(definition);
  for(const resource of nativeHeadResources(bank)){
    if(resource.nativeHeadSource)readNativeHeadSource(repo,{file:resource.file,sha256:resource.sha256,...resource.nativeHeadSource},bank.primary);
    else if(resource.nativeHeadPrimary&&resource.file===bank.primary.file&&resource.sha256===bank.primary.sha256)readNativeHeadPrimary(repo,bank.primary);
    else throw new Error('Unknown face candidate resource identity');
  }
  return {bank,definitionFile:entry.file,definitionHash:hash(bytes)};
}
