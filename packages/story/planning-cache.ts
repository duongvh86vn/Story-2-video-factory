import path from 'node:path';
import {promises as fs} from 'node:fs';
import type {ZodType,ZodTypeDef} from 'zod';
import type {FactoryConfig,ModelRole} from '../core/config.js';
import {hash,readJson,safeRealPath,walk,writeJson} from '../core/utils.js';
import {jsonSchemaFor,validateStructured,type ModelRequest,type ModelResponse} from '../models/adapter.js';
import type {AttemptRecord} from '../models/journal.js';

export function planningCacheIdentity<T>(config:FactoryConfig,role:ModelRole,request:ModelRequest,schema:ZodType<T,ZodTypeDef,any>,binding:unknown):string {
  return hash({version:1,role,request,schema:jsonSchemaFor(schema),binding,models:{primary:config.models[role],fallback:config.models.fallback}});
}
interface AcceptedReceipt {status:string;request?:ModelRequest;binding?:unknown;response?:unknown;result?:unknown;cacheIdentity?:string;baseRequestHash?:string;}
interface ModelArtifact extends AttemptRecord {request:ModelRequest;schema:unknown;response?:ModelResponse;}
const repairPrefix='\n\nDomain validation failed: ';
/** Reuse an accepted domain result only with its successful provider/journal proof.
 * The current schema and domain normalizer still run. Failed domain attempts and
 * bare/edited aggregate artifacts are never promoted to an accepted checkpoint. */
export async function reuseAcceptedPlanning<T,R>(root:string,config:FactoryConfig,role:ModelRole,stage:string,request:ModelRequest,
  schema:ZodType<T,ZodTypeDef,any>,normalize:(value:T)=>R|Promise<R>,binding:unknown):Promise<{result:R}|undefined> {
  if(!(role==='planner'&&/^(?:story-analysis|character-bible|chapters|beats-[a-zA-Z0-9_.-]+)$/.test(stage)||role==='camera'&&stage==='camera-direction'))return;
  const identity=planningCacheIdentity(config,role,request,schema,binding),jsonSchema=jsonSchemaFor(schema);
  let journal:AttemptRecord[];
  try {journal=(await fs.readFile(await safeRealPath(root,'logs/model-calls.jsonl'),'utf8')).trim().split(/\r?\n/u).filter(Boolean).map(line=>JSON.parse(line));}catch{return;}
  const primary=config.models[role],fallback=config.models.fallback,candidates:ModelRole[]=[role];
  if(fallback.provider!=='mock'&&(primary.provider!==fallback.provider||primary.model!==fallback.model||primary.base_url!==fallback.base_url))candidates.push('fallback');
  const receipts:Array<{relative:string;bytes:Buffer;receipt:AcceptedReceipt;input:ModelRequest;requestHash:string;contextMatch:'exact'|'accepted-character-checkpoint'}>=[];
  for(const file of (await walk(path.join(root,'work','attempts',stage))).filter(file=>/^\d+\.json$/u.test(path.basename(file)))){
    try {
      const relative=path.relative(root,file).split(path.sep).join('/'),safe=await safeRealPath(root,relative),bytes=await fs.readFile(safe);
      if(bytes.length>16*1024*1024)continue;
      const receipt=JSON.parse(bytes.toString('utf8')) as AcceptedReceipt,input=receipt.request;
      if(receipt.status!=='accepted'||!input||receipt.response===undefined||hash(receipt.binding)!==hash(binding)||hash(input.system)!==hash(request.system))continue;
      const exactContext=hash(input.context)===hash(request.context);
      const oldContext=input.context&&typeof input.context==='object'&&!Array.isArray(input.context)?input.context as Record<string,unknown>:undefined;
      const currentContext=request.context&&typeof request.context==='object'&&!Array.isArray(request.context)?request.context as Record<string,unknown>:undefined;
      // A character-bible writes its accepted value into the next request's
      // existing field. Recognize only that exact canonical provider value;
      // all other context, original request and current domain gates stay bound.
      const characterCheckpoint=!exactContext&&stage==='character-bible'&&oldContext&&currentContext&&currentContext.existing!==undefined&&receipt.result!==undefined
        &&hash(currentContext.existing)===hash(receipt.result)
        &&hash(schema.parse(receipt.response))===hash(schema.parse(receipt.result))
        &&hash({...oldContext,existing:currentContext.existing})===hash(currentContext);
      if(!exactContext&&!characterCheckpoint)continue;
      const receiptBaseRequest=characterCheckpoint?{...request,context:input.context}:request;
      const receiptIdentity=characterCheckpoint?planningCacheIdentity(config,role,receiptBaseRequest,schema,binding):identity;
      // Camera is a new role with an exact-settings contract, not a migration
      // path for historical planner receipts lacking generation settings proof.
      if(role==='camera'&&(receipt.cacheIdentity!==receiptIdentity||receipt.baseRequestHash!==hash(receiptBaseRequest)))continue;
      if(input.prompt!==request.prompt&&!input.prompt.startsWith(request.prompt+repairPrefix))continue;
      if(receipt.cacheIdentity!==undefined&&receipt.cacheIdentity!==receiptIdentity||receipt.baseRequestHash!==undefined&&receipt.baseRequestHash!==hash(receiptBaseRequest))continue;
      const requestHash=hash({role,operation:'structured',input,schema:jsonSchema,routing:candidates.map(candidate=>{
        const {provider,model,base_url}=config.models[candidate];return {provider,model,base_url};
      })});
      receipts.push({relative,bytes,receipt,input,requestHash,contextMatch:characterCheckpoint?'accepted-character-checkpoint':'exact'});
    }catch{/* A receipt alone cannot authorize reuse. */}
  }
  // UUID paths and copied-file mtimes do not encode acceptance order. Select
  // the latest successful journal response that has an accepted domain proof.
  for(let completedIndex=journal.length-1;completedIndex>=0;completedIndex--){
    const completed=journal[completedIndex];
    if(!completed||completed.event!=='completed'||completed.status!=='success'||completed.role!==role||completed.operation!=='structured')continue;
    for(const {relative,bytes,receipt,input,requestHash,contextMatch} of receipts){
      if(completed.requestHash!==requestHash)continue;
      try {
        const settings=config.models[completed.routedRole];
        if(!candidates.includes(completed.routedRole)||settings.provider!==completed.provider||settings.model!==completed.model)continue;
        const started=journal.find(record=>record.event==='started'&&record.callId===completed.callId&&record.id===completed.id&&record.requestHash===requestHash);
        if(!started||started.promptHash!==hash(input)||completed.promptHash!==started.promptHash)continue;
        const modelRelative=`work/model-attempts/${completed.callId}.json`;
        const modelBytes=await fs.readFile(await safeRealPath(root,modelRelative));
        if(modelBytes.length>16*1024*1024)continue;
        const artifact=JSON.parse(modelBytes.toString('utf8')) as ModelArtifact;
        if(artifact.status!=='success'||artifact.callId!==completed.callId||artifact.id!==completed.id||artifact.requestHash!==requestHash||hash(artifact.request)!==hash(input)||hash(artifact.schema)!==hash(jsonSchema)||!artifact.response||hash(artifact.response.text)!==completed.responseHash||artifact.responseHash!==completed.responseHash)continue;
        const value=validateStructured(artifact.response,schema);
        if(hash(value)!==hash(schema.parse(receipt.response)))continue;
        let result:R;try{result=await normalize(value);}catch{continue;}
        if(hash(result)!==hash(receipt.result))continue;
        // Historical settings remain unattested; all existing request/schema/
        // routing/provider/journal and current-domain gates still apply.
        await writeJson(path.join(root,'work','planning-reuse',`${stage}.json`),{version:1,stage,cacheIdentity:identity,
          sourceReceipt:relative,sourceReceiptHash:hash(bytes),modelArtifact:modelRelative,modelArtifactHash:hash(modelBytes),
          modelCallId:completed.callId,requestHash,resultHash:hash(result),schemaHash:hash(jsonSchema),
          selection:'latest-successful-accepted-domain',completedJournalIndex:completedIndex,contextMatch,
          provenance:receipt.cacheIdentity?'settings-bound-accepted-request':'historical-accepted-contract-revalidated',
          generationSettingsHistoricallyBound:receipt.cacheIdentity!==undefined,currentDomainRevalidated:true,providerCalled:false});
        return {result};
      }catch{/* Malformed, edited or stale proof cannot authorize reuse. */}
    }
  }
}
