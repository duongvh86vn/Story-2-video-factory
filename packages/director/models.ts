import type { Shot } from '../core/schemas.js';
import type { CinematicModel } from './schemas.js';
import { fold } from '../explainer/plan.js';
import { validateConfiguration } from '../explainer/configurations.js';

/** Historical names never turn a generic modern silhouette into a historical vehicle. */
export function stageModels(shot: Shot): CinematicModel[] {
  return (shot.visualization?.parts??[]).map(part=>{
    validateConfiguration(part,shot.visualization!.type);
    // Features must come from this part's narrated cue, never from a later cue.
    const context=fold(part.sourceRefs.map(r=>r.quote).join(' '));
    const threeWheels=/\bba banh\b|\bthree wheel/.test(context);
    const identity=fold(part.label),electric=/\bdien\b|\belectric/.test(identity),combustion=/\bdot trong\b|\bxang\b|\bcombustion/.test(identity);
    return {partId:part.id,
      variant:part.configuration==='old-cylinder'?'steam-old':part.configuration==='separate-condenser'?'steam-split'
        :part.kind==='car'&&/benz|patent motor/.test(context)?'historical-note'
        :part.kind==='car'&&threeWheels?'vehicle-feature-schematic'
        :part.kind==='wheel'&&threeWheels?'three-wheel-group'
        :part.kind==='car'&&electric?'electric-vehicle-schematic':part.kind==='car'&&combustion?'combustion-vehicle-schematic'
        :part.kind==='engine'&&electric?'electric-motor':part.kind==='engine'&&combustion?'combustion-engine':'conceptual',
      sourceRefs:part.sourceRefs};
  });
}
