import {promises as fs} from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import dotenv from 'dotenv';
import {apiKey,endpoint,ModelError} from '../packages/models/adapter.js';
import {readFlowImageTimeline} from '../packages/image-motion/flow-timeline.js';
import {proposeTimestampMotion,validateMotionProposalOutput} from '../packages/image-motion/motion-proposal.js';
import {MotionProposalGateway,motionProposalGatewaySettings} from '../packages/image-motion/proposal-gateway.js';

const {values}=parseArgs({options:{source:{type:'string'},clips:{type:'string'},output:{type:'string'},fps:{type:'string'},model:{type:'string'},'max-calls':{type:'string'},'max-output-tokens':{type:'string'},env:{type:'string'}}});
if(!values.source||!values.clips||!values.output)throw Error('--source --clips id[,id] --output are required');
const maxCalls=Number(values['max-calls']??4),maxOutputTokens=Number(values['max-output-tokens']??2400),ids=values.clips.split(',').map(Number);
if(!Number.isSafeInteger(maxCalls)||maxCalls<1||maxCalls>32||ids.some(id=>!Number.isSafeInteger(id)||id<1)||new Set(ids).size!==ids.length||ids.length>32)throw Error('Select unique scene IDs and max-calls1–32');
if(values.env)dotenv.config({path:path.resolve(values.env),quiet:true});
else dotenv.config({path:process.env.STORY_FACTORY_ENV_FILE??path.resolve('.env'),quiet:true});
const sourceRoot=path.resolve(values.source),model=values.model??'coder';
const {output}=await validateMotionProposalOutput({cwd:process.cwd(),sourceRoot,output:path.resolve(values.output)});
const settings=motionProposalGatewaySettings(model);
endpoint(settings.base_url!,'/chat/completions');
const base=new MotionProposalGateway(settings,maxOutputTokens);
let calls=0;
// Budget is shared across the selected scenes. Cache hits never enter this adapter.
const adapter={
  generateText:base.generateText.bind(base),generateStructured:base.generateStructured.bind(base),
  get lastResponse(){return base.lastResponse;},
  analyzeImages:async(input:Parameters<typeof base.analyzeImages>[0])=>{
    if(calls>=maxCalls)throw Error('Motion proposal call budget exhausted');calls++;return base.analyzeImages(input);
  }
};
const timeline=await readFlowImageTimeline(sourceRoot,{fps:Number(values.fps??60),variant:'fullhd'});
if(ids.some(id=>!timeline.clips.some(c=>c.id===id)))throw Error('Scene is absent from source timeline');
const results=[];
for(const id of ids){
  try{
    const receipt=await proposeTimestampMotion({cwd:process.cwd(),sourceRoot,output,clip:timeline.clips.find(c=>c.id===id)!,adapter,
      beforeRequest:()=>{if(!apiKey(settings))throw new ModelError('configuration','Configure MODEL_GATEWAY_KEY locally');if(calls>=maxCalls)throw new ModelError('call_budget','Motion proposal call budget exhausted');},
      modelIdentity:{model,baseUrl:settings.base_url!,maxOutputTokens,temperature:settings.temperature}});
    results.push({clipId:id,status:receipt.proposal.status,cached:receipt.cached,receipt:path.join(receipt.directory,'receipt.json'),usage:receipt.usage??null});
  }catch(error){results.push({clipId:id,status:'proposal-failed',code:error instanceof ModelError?error.code:'local-validation',httpStatus:error instanceof ModelError?error.status??null:null,automaticRetry:false});process.exitCode=1;break;}
}
await fs.mkdir(output,{recursive:true});
const summary={model,calls,maxCalls,results,applied:false,qualityAccepted:false,productionReady:false};
// Each invocation has a distinct summary; the per-scene receipts remain immutable.
const summaryFile=path.join(output,'run-'+Date.now()+'.json');await fs.writeFile(summaryFile,JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...summary,summaryFile}));
