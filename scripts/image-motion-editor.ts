/** Isolated Studio for image preparation. Never starts production/model/TTS work. */
import path from 'node:path';
import {promises as fs} from 'node:fs';
import {parseArgs} from 'node:util';
import {z} from 'zod';
import {createProject} from '../packages/orchestrator/index.js';
import {buildServer} from '../apps/server/index.js';
import {ProjectName} from '../apps/server/security.js';

const {values}=parseArgs({options:{port:{type:'string'},projects:{type:'string'},name:{type:'string'},source:{type:'string'}}});
const port=z.coerce.number().int().min(1).max(65535).parse(values.port??'8858'),name=ProjectName.parse(values.name??'image-motion-prep');
const projectsRoot=path.resolve(values.projects??'runtime/image-motion/studio-projects');await fs.mkdir(projectsRoot,{recursive:true});
const root=path.join(projectsRoot,name);try{await fs.access(root);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;await createProject(name,{root:projectsRoot});}
const app=await buildServer({projectsRoot});
try{
  if(values.source){
    const source=path.resolve(values.source),stat=await fs.stat(source);if(!stat.isFile()||stat.size>16*1024*1024)throw new Error('Source image must be a file of at most 16 MB');
    const base='/api/projects/'+encodeURIComponent(name)+'/image-motion',current=await app.inject({url:base});if(current.statusCode!==200)throw new Error('Cannot open project image catalog');
    const boundary='factory-image-preparation',bytes=await fs.readFile(source),filename=path.basename(source);
    // Filename is independently validated by the server before any write.
    if(/["\r\n]/.test(filename))throw new Error('Invalid source filename');
    const response=await app.inject({method:'POST',url:base+'/images?revision='+current.json().revision,headers:{'content-type':'multipart/form-data; boundary='+boundary},payload:Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`),bytes,Buffer.from(`\r\n--${boundary}--\r\n`)])});
    if(response.statusCode!==201)throw new Error(response.json().error?.message??'Image import failed');
  }
  await app.listen({host:'127.0.0.1',port});console.log(JSON.stringify({studio:`http://127.0.0.1:${port}/`,editor:`http://127.0.0.1:${port}/api/projects/${encodeURIComponent(name)}/image-motion/editor`,projectsRoot,scope:'Image preparation and local preview; not final production'}));
  for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>void app.close().then(()=>{process.exitCode=0;}));
}catch(error){await app.close();throw error;}
