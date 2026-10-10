// DECLARED / NOT RUN by implementation. No fixture is invoked outside callbacks.
import assert from 'node:assert/strict';
import test from 'node:test';
import {ConfigSchema} from '../packages/core/config.js';
import {NarrationSchema,type Storyboard} from '../packages/core/schemas.js';
import {hash} from '../packages/core/utils.js';
import {parseScript,ScriptDocumentSchema} from '../packages/ingest/script.js';
import {scriptVoiceSelections} from '../packages/voice/dialogue.js';
import {parseGeneratedScript} from '../packages/orchestrator/script-generation.js';
import {assertExplicitCueSpeaker,validateExplicitNarrationSpeakers,explicitSpeakerNameEvidence} from '../packages/actors/explicit-speakers.js';

test('explicit dialogue preserves spoken words, source lines, turns and subtitle ownership',()=>{
  const text='[lila] Is the soup ready?\nKeep the pot warm.\n\n[karo] Almost!\n[narrator] They wait.';
  const document=parseScript(text,'input/script.txt','dialogue');
  assert.equal(document.original,text);assert.equal(document.sourceHash,hash(text));
  assert.equal(document.text,'Is the soup ready? Keep the pot warm.\n\nAlmost!\n\nThey wait.');
  assert.deepEqual(document.paragraphs.map(p=>[p.speakerId,p.sourceStartLine,p.sourceEndLine]),[['lila',1,2],['karo',4,4],['narrator',5,5]]);
  for(const p of document.paragraphs){
    const chunks=document.chunks.filter(c=>c.paragraphIndex===p.index);
    assert.ok(chunks.every(c=>c.speakerId===p.speakerId&&[...c.text].length<=120));
    assert.equal(chunks.map(c=>(c.separatorBefore??'')+c.text).join(''),p.text);
  }
});

test('plain narration does not interpret literal speaker-like text',()=>{
  const document=parseScript('[lila] Hello!');
  assert.equal(document.text,'[lila] Hello!');assert.equal(document.format,undefined);
  assert.ok(document.chunks.every(c=>c.speakerId===undefined));
  const config=ConfigSchema.parse({voice:{voice_id:'common',speaker_voices:[{speaker_id:'narrator',voice_id:'different'}]}});
  assert.equal(scriptVoiceSelections(document,config).get('narrator')!.voice.voice_id,'common');
});

test('a blank paragraph cannot silently authorize an unmarked dialogue turn',()=>{
  for(const text of ['Hello!','[lila] Hi!\n\nUnlabelled turn.','[lila]','[bad id] Hi!','[constructor] Hi!'])
    assert.throws(()=>parseScript(text,'input/script.txt','dialogue'));
  const document=parseScript('[lila] Hi!\n[karo] Hello!','input/script.txt','dialogue');
  assert.deepEqual(document.paragraphs.map(p=>p.speakerId),['lila','karo']);
});

test('Japanese and Korean dialogue retain every spoken character and chunk speaker',()=>{
  for(const spoken of ['森の中で二人は食べ物を探しています。'.repeat(12),'두 사람은 숲에서 먹을 것을 찾고 있습니다. '.repeat(12).trim()]){
    const document=parseScript('[lila] '+spoken,'input/script.txt','dialogue');
    assert.equal(document.chunks.map(c=>(c.separatorBefore??'')+c.text).join(''),spoken);
    assert.ok(document.chunks.length>1&&document.chunks.every(c=>c.speakerId==='lila'&&[...c.text].length<=120));
  }
});

test('stale chunk speakers and speaker metadata on plain narration fail validation',()=>{
  const dialogue=parseScript('[lila] Hello!','input/script.txt','dialogue');
  assert.throws(()=>ScriptDocumentSchema.parse({...dialogue,chunks:dialogue.chunks.map(c=>({...c,speakerId:'karo'}))}));
  assert.throws(()=>ScriptDocumentSchema.parse({...dialogue,format:'narration'}));
  assert.throws(()=>ScriptDocumentSchema.parse({...dialogue,paragraphs:[]}));
});

test('all actor voices resolve before synthesis and cannot fall back to narrator',()=>{
  const document=parseScript('[lila] Hello!\n[karo] Hello!\n[narrator] They smile.','input/script.txt','dialogue');
  const config=ConfigSchema.parse({voice:{voice_id:'voiceover',speaker_voices:[{speaker_id:'lila',voice_id:'female-A'},{speaker_id:'karo',voice_id:'male-B'}]}}),before=structuredClone(config);
  const selections=scriptVoiceSelections(document,config);
  assert.deepEqual([...selections].map(([id,c])=>[id,c.voice.voice_id]),[['lila','female-A'],['karo','male-B'],['narrator','voiceover']]);
  assert.deepEqual(config,before);
  assert.throws(()=>scriptVoiceSelections(document,{...config,voice:{...config.voice,speaker_voices:config.voice.speaker_voices!.slice(0,1)}}),/needs-voice.*karo/);
  assert.throws(()=>ConfigSchema.parse({voice:{speaker_voices:[{speaker_id:'lila',voice_id:'A'},{speaker_id:'lila',voice_id:'B'}]}}));
  assert.throws(()=>ConfigSchema.parse({voice:{speaker_voices:[{speaker_id:'karo',voice_id:'  '}]}}));
});

test('cached and fresh generated drafts share selected-format and kind validation',()=>{
  const draft={title:'A meal',kind:'fiction' as const,format:'dialogue' as const,narration:'[lila] Is it ready?',warnings:[]};
  const config=ConfigSchema.parse({input:{script_format:'dialogue'},script_generation:{kind:'fiction'}});
  assert.equal(parseGeneratedScript(draft,config).chunks[0]!.speakerId,'lila');
  assert.throws(()=>parseGeneratedScript({...draft,format:undefined},config),/format differs/);
  assert.throws(()=>parseGeneratedScript(draft,ConfigSchema.parse({script_generation:{kind:'fiction'}})),/format differs/);
  assert.throws(()=>parseGeneratedScript({...draft,kind:'factual'},config),/kind differs/);
});

test('source speaker IDs bind visible actors through cuts and prohibit narrator lip-sync',()=>{
  const narration=NarrationSchema.parse({mode:'script',durationMs:2000,segments:[
    {id:'cue-1',speakerId:'lila',text:'Hello!',startMs:0,endMs:1000},
    {id:'cue-2',speakerId:'narrator',text:'They smile.',startMs:1100,endMs:2000},
  ],words:[]});
  // Utility fixture only: does not claim full storyboard/physical/film acceptance.
  const board=(claims:string[],from=0,to=1000)=>({shots:[{id:'shot-1',startMs:from,endMs:to,cinematic:{actorScene:{primary:{id:'karo'},speakingSegmentIds:[],supporting:[{character:{id:'lila'},speakingSegmentIds:claims}]}}}]} as unknown as Storyboard);
  assert.doesNotThrow(()=>validateExplicitNarrationSpeakers(board(['cue-1'],500,1000),narration));
  assert.throws(()=>validateExplicitNarrationSpeakers(board([],500,1000),narration),/visible lila/);
  assert.throws(()=>validateExplicitNarrationSpeakers(board(['cue-2'],1100,2000),narration),/belongs to narrator/);
  assert.throws(()=>assertExplicitCueSpeaker(narration,'karo','cue-1'),/belongs to lila/);
  assert.throws(()=>assertExplicitCueSpeaker(narration,'lila','unknown'),/unknown cue/);
  const legacy={...narration,segments:narration.segments.map(({speakerId,...cue})=>cue)};
  assert.doesNotThrow(()=>validateExplicitNarrationSpeakers(board([]),legacy));
});

test('source markers name only their own nonhistorical performer without inventing biography',()=>{
  const narration=NarrationSchema.parse({mode:'script',durationMs:1000,segments:[{id:'cue-1',speakerId:'lila',text:'Is the soup ready?',startMs:0,endMs:1000}],words:[]});
  const refs=[{kind:'narration',segmentId:'cue-1',quote:'Is the soup ready?'}];
  assert.equal(explicitSpeakerNameEvidence(narration,'lila','Lila','fictional',refs),true);
  assert.equal(explicitSpeakerNameEvidence(narration,'lila','Lila','illustrative',refs),true);
  assert.equal(explicitSpeakerNameEvidence(narration,'lila','Tesla','fictional',refs),false);
  assert.equal(explicitSpeakerNameEvidence(narration,'karo','Karo','fictional',refs),false);
  assert.equal(explicitSpeakerNameEvidence(narration,'lila','Lila','historical',refs),false);
  assert.equal(explicitSpeakerNameEvidence(narration,'lila','Lila','fictional',[{...refs[0]!,quote:'She invented the pot.'}]),false);
  assert.equal(explicitSpeakerNameEvidence(narration,'lila','Lila','fictional',[{...refs[0]!,segmentId:'foreign'}]),false);
});
