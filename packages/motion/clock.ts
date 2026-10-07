/** GSAP rounds seconds to this resolution. Keep native frame durations untouched. */
export const spriteClock=(seconds:number)=>Math.round(seconds*10_000_000)/10_000_000;

export const spriteSeconds=(timeMs:number)=>{
  if(!Number.isFinite(timeMs))throw new Error('Sprite clock must be finite');
  return spriteClock(timeMs/1000);
};
