import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { buildServer } from '../apps/server/index.js';
import * as core from '../packages/orchestrator/index.js';
import { hash } from '../packages/core/utils.js';
import { temporary } from './support.js';

async function fixture(t:TestContext){
  const projectsRoot=await temporary(t),root=await core.createProject('fixture',{root:projectsRoot});
  const configFile=path.join(root,'project.yaml'),raw=YAML.parse(await fs.readFile(configFile,'utf8'));
  raw.input={mode:'srt'};raw.host={profile:'library/characters/MINI-ROBOT.md'};
  raw.presentation={mode:'story-cinematic',design_brief:'Initial design'};
  raw.models={storyboard:{provider:'mock',model:'offline-director'}};
  await fs.writeFile(configFile,YAML.stringify(raw));
  await fs.writeFile(path.join(root,'input/script.txt'),'Original canonical script.');
  const app=await buildServer({projectsRoot,coordinator:core});t.after(()=>app.close());
  const revision=hash(await fs.readFile(configFile));
  return {root,app,revision};
}
function multipart(script:string,name='script.txt'){
  const boundary='setup-revision-fixture';
  return {headers:{'content-type':`multipart/form-data; boundary=${boundary}`},payload:Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="script"; filename="${name}"\r\nContent-Type: text/plain\r\n\r\n${script}\r\n--${boundary}--\r\n`)};
}
const settingsUrl='/api/projects/fixture/settings';
async function concurrentSettings(f:Awaited<ReturnType<typeof fixture>>,revision=f.revision){
  const saved=await f.app.inject({method:'PATCH',url:settingsUrl,payload:{revision,host:'stick-man',models:{storyboard:{provider:'codex-cli',model:'default'}},presentation:{design_brief:'Concurrent editor design'}}});
  assert.equal(saved.statusCode,200,saved.body);return saved.json().settings.revision as string;
}
async function canonicalBytes(root:string){
  return Promise.all(['project.yaml','project-state.json','input/script.txt'].map(file=>fs.readFile(path.join(root,file))));
}
function conflict(response:{statusCode:number;body:string;json:()=>{error:{code:string}}}){
  assert.equal(response.statusCode,409,response.body);assert.equal(response.json().error.code,'REVISION_CONFLICT');
}

test('stale setup script revision cannot overwrite canonical input, current settings or state',async t=>{
  const f=await fixture(t);await concurrentSettings(f);const before=await canonicalBytes(f.root);
  const response=await f.app.inject({method:'PUT',url:'/api/projects/fixture/script',payload:{format:'txt',text:'Stale setup script.',revision:hash(before[2]!),settingsRevision:f.revision}});
  conflict(response);assert.deepEqual(await canonicalBytes(f.root),before);
});

test('stale setup upload revision rejects before canonical files and settings are committed',async t=>{
  const f=await fixture(t);await concurrentSettings(f);const before=await canonicalBytes(f.root);
  const response=await f.app.inject({method:'POST',url:`/api/projects/fixture/upload?settingsRevision=${f.revision}`,...multipart('Stale uploaded script.')});
  conflict(response);assert.deepEqual(await canonicalBytes(f.root),before);
  assert.equal((await fs.readdir(f.root)).some(name=>name.startsWith('.studio-upload-')),false);
});

test('own guarded script mutation returns the exact settings revision accepted by the next patch',async t=>{
  const f=await fixture(t),text='Own script mutation.';
  const saved=await f.app.inject({method:'PUT',url:'/api/projects/fixture/script',payload:{format:'txt',text,revision:hash('Original canonical script.'),settingsRevision:f.revision}});
  assert.equal(saved.statusCode,200,saved.body);const result=saved.json();
  assert.equal(result.revision,hash(text));assert.equal(result.settingsRevision,hash(await fs.readFile(path.join(f.root,'project.yaml'))));assert.notEqual(result.settingsRevision,f.revision);
  const final=await f.app.inject({method:'PATCH',url:settingsUrl,payload:{revision:result.settingsRevision,presentation:{design_brief:'Own final design'}}});
  assert.equal(final.statusCode,200,final.body);assert.equal(final.json().settings.input.mode,'script');assert.equal(final.json().settings.presentation.design_brief,'Own final design');
  assert.equal(await fs.readFile(path.join(f.root,'input/script.txt'),'utf8'),text);
});

test('own guarded upload mutation returns its revision and a subsequent settings patch preserves the uploaded input',async t=>{
  const f=await fixture(t),text='# Own uploaded script\n\nAn unchanged narrator.';
  const saved=await f.app.inject({method:'POST',url:`/api/projects/fixture/upload?settingsRevision=${f.revision}`,...multipart(text,'script.md')});
  assert.equal(saved.statusCode,201,saved.body);const result=saved.json();assert.equal(result.files[0].path,'input/script.md');
  assert.equal(result.settingsRevision,hash(await fs.readFile(path.join(f.root,'project.yaml'))));assert.notEqual(result.settingsRevision,f.revision);
  const final=await f.app.inject({method:'PATCH',url:settingsUrl,payload:{revision:result.settingsRevision,presentation:{design_brief:'Own upload design'}}});
  assert.equal(final.statusCode,200,final.body);assert.equal(final.json().settings.input.script,'input/script.md');
  assert.equal(await fs.readFile(path.join(f.root,'input/script.md'),'utf8'),text);
});

test('another host, model and brief change between own script mutation and final setup save rejects the old mutation revision',async t=>{
  const f=await fixture(t),text='Own script stays committed.';
  const own=await f.app.inject({method:'PUT',url:'/api/projects/fixture/script',payload:{format:'txt',text,revision:hash('Original canonical script.'),settingsRevision:f.revision}});
  assert.equal(own.statusCode,200,own.body);const ownRevision=own.json().settingsRevision;
  const newer=await concurrentSettings(f,ownRevision);assert.notEqual(newer,ownRevision);const before=await canonicalBytes(f.root);
  const stale=await f.app.inject({method:'PATCH',url:settingsUrl,payload:{revision:ownRevision,host:'mini-robot',models:{storyboard:{provider:'mock',model:'offline-director'}},presentation:{design_brief:'Stale modal design'}}});
  conflict(stale);assert.deepEqual(await canonicalBytes(f.root),before);
  const current=(await f.app.inject({url:'/api/projects/fixture'})).json();
  assert.ok(current.settings.host.profile.includes('STICK-MAN'));assert.equal(current.settings.creativeModel.provider,'codex-cli');assert.equal(current.settings.presentation.design_brief,'Concurrent editor design');
});
