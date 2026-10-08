import {promises as fs} from 'node:fs';
import path from 'node:path';
import {hash} from '../core/utils.js';
import {NativeHeadBankDefinitionSchema,nativeHeadBank} from '../animation/native-head-bank.js';
import {nativeHeadResources,readNativeHeadSource,readNativeHeadPrimary} from '../animation/native-head-resources.js';
import {HEAD_FACE_CANDIDATES,HEAD_FACE_EXPRESSION_CANDIDATES,HEAD_FACE_MODES,HEAD_FACE_VIEWS,type HeadFaceView,type HeadFaceMode} from './head-face-candidates.js';
import {NATIVE_HEAD_ACTORS,nativeHeadIdentities,NATIVE_SUPPORTING_HEAD_BANK_VERSION,NATIVE_EMOTION_HEAD_BANK_VERSION,type NativeHeadActor} from '../animation/native-head-identity.js';

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
export async function headFaceCandidate(repo:string,actor:NativeHeadActor,view:HeadFaceView='three-quarter-right',mode:HeadFaceMode='speech-eyes'){
  if(!NATIVE_HEAD_ACTORS.includes(actor)||!HEAD_FACE_VIEWS.includes(view)||!HEAD_FACE_MODES.includes(mode))throw new Error('Invalid face candidate actor/view/mode');
  const entry=(mode==='expressions'?HEAD_FACE_EXPRESSION_CANDIDATES:HEAD_FACE_CANDIDATES).find(c=>c.actor===actor&&c.view===view);
  if(!entry)throw new Error(`needs-head-face-candidate: ${actor}/${view} has not been authored`);
  const bytes=await boundedHeadFaceFile(repo,entry.file,200*1024),definition=NativeHeadBankDefinitionSchema.parse(JSON.parse(bytes.toString('utf8')));
  const version=mode==='expressions'?NATIVE_EMOTION_HEAD_BANK_VERSION:nativeHeadIdentities[actor].supporting?NATIVE_SUPPORTING_HEAD_BANK_VERSION:'native-head-bank-3';
  if(definition.actor!==actor||definition.id!==entry.id||definition.version!==version||definition.cells.length!==1||definition.cells[0]!.yawDeg!==null||definition.routes.length||
    definition.bodyViews.length!==1||definition.bodyViews[0]!.view!==view||
    definition.source.file!=='library/topics/prehistoric-life/head-cells/'+entry.headFile)throw new Error('Face workbench needs the exact fixed source-angle candidate and compatible body view');
  if('sha256' in entry&&(definition.source.sha256!==entry.sha256||definition.source.width!==entry.width||definition.source.height!==entry.height))throw new Error('Supporting face candidate differs from its own current catalog artwork');
  const bank=nativeHeadBank(definition);
  for(const resource of nativeHeadResources(bank)){
    if(resource.nativeHeadSource)readNativeHeadSource(repo,{file:resource.file,sha256:resource.sha256,...resource.nativeHeadSource},bank.primary);
    else if(resource.nativeHeadPrimary&&resource.file===bank.primary.file&&resource.sha256===bank.primary.sha256)readNativeHeadPrimary(repo,bank.primary);
    else throw new Error('Unknown face candidate resource identity');
  }
  return {bank,definitionFile:entry.file,definitionHash:hash(bytes)};
}
