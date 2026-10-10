import {parseArgs} from 'node:util';
import {existingActorArt} from '../packages/topics/art-reuse.js';
const {values}=parseArgs({options:{actor:{type:'string'}}});
if(values.actor!=='lila'&&values.actor!=='karo')throw new Error('--actor must be lila or karo');
console.log(JSON.stringify(await existingActorArt(process.cwd(),values.actor),null,2));
