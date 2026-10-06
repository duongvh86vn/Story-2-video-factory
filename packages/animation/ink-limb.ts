import type { Point } from './schemas.js';
const mix=(a:Point,b:Point,t:number):Point=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const fmt=(p:Point)=>`${Number(p.x.toFixed(4))} ${Number(p.y.toFixed(4))}`;
/** Two joined cubics pass through the physical joint with one shared tangent.
 * Endpoints stay exactly on the hand/foot/contact anchors; curvature is bounded
 * by the shorter bone. No independent visual spring can break contact. */
export function inkLimb(start:Point,joint:Point,end:Point):string {
  const u={x:joint.x-start.x,y:joint.y-start.y},v={x:end.x-joint.x,y:end.y-joint.y};
  const a=Math.hypot(u.x,u.y),b=Math.hypot(v.x,v.y);
  if(a<1e-8||b<1e-8)throw new Error('Ink limb requires two nonzero bones');
  let tx=u.x/a+v.x/b,ty=u.y/a+v.y/b,mag=Math.hypot(tx,ty);
  if(mag<1e-8){tx=u.x/a;ty=u.y/a;mag=1;}
  tx/=mag;ty/=mag;
  const handle=Math.min(a,b)*.17;
  const before={x:joint.x-tx*handle,y:joint.y-ty*handle},after={x:joint.x+tx*handle,y:joint.y+ty*handle};
  return `M${fmt(start)} C${fmt(mix(start,joint,.42))} ${fmt(before)} ${fmt(joint)} C${fmt(after)} ${fmt(mix(joint,end,.58))} ${fmt(end)}`;
}

export function pathCoordinates(value:string):number[] {return (value.match(/-?\d+(?:\.\d+)?/g)??[]).map(Number);}
