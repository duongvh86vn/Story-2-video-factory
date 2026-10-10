// Installs local image-matting dependencies separately from shared node_modules.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const target=path.join(root,'runtime/asset-tools');
for(const relative of ['runtime','runtime/asset-tools','runtime/asset-tools/node_modules']){
  const file=path.join(root,relative);
  try{const stat=await fs.lstat(file);if(stat.isSymbolicLink()||!stat.isDirectory())throw Error('Linked or non-directory asset runtime refused');}
  catch(error){if(error.code!=='ENOENT')throw error;}
}
await fs.mkdir(target,{recursive:true});
for(const name of ['package.json','package-lock.json']){
  const source=await fs.readFile(path.join(root,'config/asset-tools',name));
  const file=path.join(target,name);
  try{const stat=await fs.lstat(file);if(stat.isSymbolicLink()||!stat.isFile()||!(await fs.readFile(file)).equals(source))throw Error('Existing asset dependency metadata differs');}
  catch(error){if(error.code!=='ENOENT')throw error;await fs.writeFile(file,source,{flag:'wx'});}
}
const args=['ci','--no-audit','--no-fund','--omit=dev'];
// Windows requires cmd for npm.cmd. The only shell text is these fixed literals;
// the workspace directory is passed as cwd, never interpolated into shell code.
const child=process.platform==='win32'
  ?spawn(process.env.ComSpec??'C:/Windows/System32/cmd.exe',['/d','/s','/c','npm ci --no-audit --no-fund --omit=dev'],{cwd:target,stdio:'inherit',windowsHide:true})
  :spawn('npm',args,{cwd:target,stdio:'inherit'});
child.on('error',()=>{process.exitCode=1;console.error('Asset dependency installation failed');});
child.on('exit',code=>{process.exitCode=code??1;});
