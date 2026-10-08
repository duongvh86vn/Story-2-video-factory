import path from 'node:path';
import {findRepoRoot} from '../packages/core/config.js';
import {writeJson} from '../packages/core/utils.js';
import {nativeSeatArtDescription,nativeSeatArtInventory} from '../packages/topics/native-seat-art.js';
import {nativeSeatSurfaceInventory} from '../packages/topics/native-seat-surface-inventory.js';

// Static PNG/hash/alpha inventory only; no motion/renderer or production approval.
const repo=await findRepoRoot(),materials=await nativeSeatArtInventory(repo),surface=await nativeSeatSurfaceInventory(repo);
await writeJson(path.join(repo,'library/topics/prehistoric-life/native-seat-v1/inventory-v1.json'),{...nativeSeatArtDescription,materials,surfaceCandidate:surface,productionRig:null});
console.log(JSON.stringify({materials:materials.length,tiles:materials.reduce((n,m)=>n+m.tiles.length,0),surface:surface.status,registered:false,productionReady:false,motionVerified:false}));
