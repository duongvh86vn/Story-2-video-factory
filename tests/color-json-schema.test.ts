import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';
import {z} from 'zod';
import {HostProfileSchema} from '../packages/host/schemas.js';
import {ArtDirectionSchema} from '../packages/director/art-direction-schemas.js';
import {ActorDefinitionSchema} from '../packages/actors/schemas.js';
import {jsonSchemaFor,validateStructured,StructuredOutputError} from '../packages/models/adapter.js';

const Ajv=createRequire(import.meta.url)('ajv') as typeof import('ajv').default;
const ajv=new Ajv({strict:false,allErrors:true,coerceTypes:false,useDefaults:false,removeAdditional:false});
const oldRegex=/^#[\da-f]{6}$/i;
const appearance={outline:'#ABCDEF',shell:'#abcdef',screen:'#aBcDeF',accent:'#123456',badge:'#09aAFf',headScale:1,bodyScale:1,strokeWidth:4};
const host={id:'lena',version:1,kind:'stick-man',role:'story-actor',name:'Lena',description:'Ordinary fictional actor',appearance,actions:['idle','react'],immutable:['identity'],profileHash:'accepted-profile',compilerVersion:'existing',sourcePath:'library/characters/STICK-MAN.md'};
const actor={id:'lena',name:'Lena',role:'reader',kind:'stick-man',identity:'fictional',sourceRefs:[{kind:'narration',segmentId:'cue',quote:'Lena reads.'}],appearance};
const art={origin:'authored',brief:'Library table',useEnvironment:false,palette:{background:'#FFFFFF',surface:'#abcdef',ink:'#0a1B2c',accent:'#123456'},showHeading:false,layers:[],models:[]};
const specs=[
  {name:'host',schema:HostProfileSchema,fixture:host,container:'appearance',keys:['outline','shell','screen','accent','badge']},
  {name:'actor',schema:ActorDefinitionSchema,fixture:actor,container:'appearance',keys:['outline','shell','screen','accent','badge']},
  {name:'art',schema:ArtDirectionSchema,fixture:art,container:'palette',keys:['background','surface','ink','accent']},
] as const;
const validators=specs.map(s=>ajv.compile(jsonSchemaFor(s.schema as z.ZodTypeAny)));
function parity(index:number,value:unknown,accepted:boolean){
  const spec=specs[index]!,schema=spec.schema as z.ZodTypeAny,bytes=JSON.stringify(value),json=validators[index]!;
  assert.equal(json(value),accepted,JSON.stringify(json.errors));
  const parsed=schema.safeParse(value);assert.equal(parsed.success,accepted);
  if(accepted){assert.deepEqual(parsed.data,value);assert.deepEqual(validateStructured({text:bytes},schema),value);}
  else assert.throws(()=>validateStructured({text:bytes},schema),StructuredOutputError);
  assert.equal(JSON.stringify(value),bytes,'validation must not strip, coerce, default or mutate the input');
}
test('explicit ASCII hex schema keeps legacy regex language including newline/end cases',()=>{
  const newRegex=/^#[0-9a-fA-F]{6}$/;
  const cases=['#ABCDEF','#abcdef','#aBcDeF','#09AFaf','#123456','#000000','#FFFFFF',
    '#abcdef\n','#abcdef\r','#abcdef\r\n','#abcdef\u2028','#abcdef\u2029','\n#abcdef','#abcdef\nignored',
    '#abcde','#abcdef0','abcdef','#ABCGEF','#１２３４５６','#Kabcde','#ſabcde','#abcdef ',' #abcdef'];
  for(let code=0;code<128;code++)cases.push('#'+String.fromCharCode(code).repeat(6));
  for(const value of cases)assert.equal(newRegex.test(value),oldRegex.test(value),JSON.stringify(value));
  for(let i=0;i<specs.length;i++)for(const value of cases){
    const s=specs[i]!,candidate=structuredClone(s.fixture) as any;candidate[s.container][s.keys[0]]=value;
    parity(i,candidate,oldRegex.test(value));
  }
});
for(let index=0;index<specs.length;index++){
  const spec=specs[index]!;
  test(`${spec.name} upper/lower/mixed colors survive JSON/Zod/adapter unchanged in every color field`,()=>{
    for(const key of spec.keys)for(const value of ['#ABCDEF','#abcdef','#aBcDeF','#09AFaf','#123456','#000000','#FFFFFF']){
      const candidate=structuredClone(spec.fixture) as any;candidate[spec.container][key]=value;parity(index,candidate,true);
    }
    const schema=jsonSchemaFor(spec.schema as z.ZodTypeAny) as any;
    for(const key of spec.keys)assert.equal(schema.properties[spec.container].properties[key].pattern,'^#[0-9a-fA-F]{6}$');
  });
  test(`${spec.name} invalid hex lengths types missing values cannot coerce or default`,()=>{
    for(const key of spec.keys)for(const value of ['#abcdex','#ABCDEG','#fff','#12345','#1234567','123456','#123 56','#١٢٣٤٥٦','#１２３４５６',' #abcdef','#abcdef ',123456,null,false,[],{},['#ABCDEF']]){
      const candidate=structuredClone(spec.fixture) as any;candidate[spec.container][key]=value;parity(index,candidate,false);
    }
    for(const key of spec.keys){const candidate=structuredClone(spec.fixture) as any;delete candidate[spec.container][key];parity(index,candidate,false);}
  });
  test(`${spec.name} unknown executable keys remain strict at envelope and color container`,()=>{
    for(const key of ['unknown','execute','onclick','__proto__']){
      const candidate=structuredClone(spec.fixture) as any;Object.defineProperty(candidate,key,{value:'bad',enumerable:true,writable:true});parity(index,candidate,false);
      const nested=structuredClone(spec.fixture) as any;Object.defineProperty(nested[spec.container],key,{value:'bad',enumerable:true,writable:true});parity(index,nested,false);
    }
  });
}
test('installed direct JSON validator compatibility is Ajv8.20.0',()=>{
  assert.equal(createRequire(import.meta.url)('ajv/package.json').version,'8.20.0');
});