// Synthetic fixtures, never character art. Only invoked inside delegated test callbacks.
import type {TestContext} from 'node:test';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {temporary} from './support.js';
import {importActorMotion,normalizeSpriteMotion} from '../packages/motion/import.js';
import type {ActorSpeechRegistration,ActorSpeech} from '../packages/motion/speech-schemas.js';
import type {ActorMotion,SpriteClip} from '../packages/motion/schemas.js';
import type {Narration} from '../packages/core/schemas.js';
import type {SpeechActivity} from '../packages/voice/schemas.js';
import {buildSpriteSpeechSchedule} from '../packages/motion/speech-clock.js';

export function speechPoints(){return {face_left:{x:6,y:16},face_right:{x:26,y:16},face_top:{x:16,y:4},face_bottom:{x:16,y:28},
  eye_left:{x:11,y:10},eye_right:{x:22,y:10},nose:{x:16,y:14},mouth_center:{x:16,y:23}};}
const regions=()=>[{x:12,y:20,w:8,h:6},{x:12,y:20,w:8,h:6}];
export async function importedSpeechFixture(t:TestContext,repeated=false){
  const root=await temporary(t),input=path.join(root,'input');await fs.mkdir(input);
  const width=repeated?32:64,height=48,baseRaw=Buffer.alloc(width*height*4);
  for(let at=0;at<baseRaw.length;at+=4){baseRaw[at]=180;baseRaw[at+1]=100;baseRaw[at+2]=40;baseRaw[at+3]=240;}
  const png=(raw:Buffer)=>sharp(raw,{raw:{width,height,channels:4}}).png().toBuffer();
  const baseBytes=await png(baseRaw),baseSheet=path.join(input,repeated?'native.png':'native.strip.png');await fs.writeFile(baseSheet,baseBytes);
  const metadata=path.join(input,repeated?'native.json':'native.strip.json');
  await fs.writeFile(metadata,JSON.stringify(repeated?{game_input:'native.png',frame_layout:{rows:{idle:[{x:0,y:0,w:32,h:48},{x:0,y:0,w:32,h:48}]}},animation:{rows:{idle:{loop:true,durations_ms:[100,100]}}}}
    :{frames:2,w:32,h:48,delay_ms:100,loop:true}));
  const nativeRegistration=path.join(input,'native-registration.json');
  await fs.writeFile(nativeRegistration,JSON.stringify({version:'actor-motion-registration-1',id:'lila-idle',actorId:'lila',state:'idle',view:'front',referenceHash:'a'.repeat(64),
    playback:{mode:'loop',end:'hold'},anchor:{x:16,y:48},landmarks:[speechPoints(),speechPoints()],notes:[]}));
  const motion=await importActorMotion(root,metadata,nativeRegistration),alternateRaw=Buffer.from(baseRaw);
  for(const x of repeated?[15]:[15,47]){const at=(22*width+x)*4;alternateRaw[at]=250;alternateRaw[at+1]=20;alternateRaw[at+2]=10;}
  const speechSheet=path.join(input,'open.png'),speechBytes=await png(alternateRaw);await fs.writeFile(speechSheet,speechBytes);
  const registration:ActorSpeechRegistration={version:'actor-speech-registration-1',id:'lila-open',motionId:motion.id,motionFingerprint:motion.fingerprint,regions:regions(),notes:[]};
  const registrationFile=path.join(input,'speech-registration.json');await fs.writeFile(registrationFile,JSON.stringify(registration));
  return {root,input,motion,baseSheet,baseBytes,baseRaw,alternateRaw,speechSheet,speechBytes,registration,registrationFile,png,width,height};
}
export function speechClockFixture(){
  const motion:ActorMotion=normalizeSpriteMotion({frames:2,w:32,h:48,delay_ms:100,loop:true},{width:64,height:48,hash:'a'.repeat(64)},
    {version:'actor-motion-registration-1',id:'lila-idle',actorId:'lila',state:'idle',view:'front',referenceHash:'a'.repeat(64),playback:{mode:'loop',end:'hold'},anchor:{x:16,y:48},requiredLandmarks:[],landmarks:[speechPoints(),speechPoints()],notes:[]},'c'.repeat(64));
  const variant:ActorSpeech={version:'actor-speech-1',id:'lila-open',actorId:motion.actorId,motionId:motion.id,motionFingerprint:motion.fingerprint,view:motion.view,referenceHash:motion.source.referenceHash,
    fingerprint:'b'.repeat(64),source:{registrationHash:'c'.repeat(64),baseSheetHash:motion.sheet.hash},sheet:{path:'speech.png',hash:'d'.repeat(64),width:64,height:48},regions:regions(),review:{status:'candidate',productionReady:false,warnings:[]}};
  const clip:SpriteClip={id:'actor.1',compositionId:'shot.1',startMs:100,endMs:1500,rate:1,placement:{x:120,y:200,scale:1,rotation:0}};
  const narration:Narration={mode:'wav',durationMs:2500,audioPath:'input/narration.wav',segments:[{id:'cue1',text:'Lila speaks.',startMs:1000,endMs:2000}],words:[]};
  const activity:SpeechActivity={method:'audio-rms',audioHash:'e'.repeat(64),windowMs:20,intervals:[{startMs:1100,endMs:1200,level:.5},{startMs:1200,endMs:1250,level:.7},{startMs:1500,endMs:1700,level:.4}]};
  const schedule=buildSpriteSpeechSchedule(narration,activity,{shotStartMs:1000,startMs:clip.startMs,endMs:clip.endMs,segmentIds:['cue1']});
  return {motion,variant,clip,narration,activity,schedule};
}
