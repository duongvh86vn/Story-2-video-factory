import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface Reservation { pid:number; token?:string; content:string; active:boolean; }
/** A recent partial write is busy; abandoned partial writes can recover after a minute. */
export async function reservation(root:string):Promise<Reservation|undefined> {
  const file=path.join(root,'.factory.lock');
  let content:string;
  try {content=await fs.readFile(file,'utf8');}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return undefined;throw error;}
  try {
    const owner=JSON.parse(content) as {pid:number;token?:string};
    if(!Number.isSafeInteger(owner.pid)||owner.pid<=0)throw new Error('Invalid reservation owner');
    let active=true;
    try{process.kill(owner.pid,0);}catch(error){active=(error as NodeJS.ErrnoException).code!=='ESRCH';}
    return {...owner,content,active};
  }catch{
    let age:number;try{age=Date.now()-(await fs.stat(file)).mtimeMs;}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return undefined;throw error;}
    return {pid:0,content,active:age<60000};
  }
}
