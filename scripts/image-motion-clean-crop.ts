import {parseArgs} from 'node:util';
import {registerCleanCropPlate} from '../packages/image-motion/register-clean-crop.js';

const {values}=parseArgs({options:{
  source:{type:'string'},crop:{type:'string'},rect:{type:'string'},output:{type:'string'},
  'background-column':{type:'string'},'background-sample':{type:'string'},tolerance:{type:'string'}
}});
if(!values.source||!values.crop||!values.rect||!values.output)
  throw Error('--source --crop --rect left,top,width,height --output are required');

function coordinates(value:string,count:number){
  const fields=value.split(',');
  if(fields.length!==count||fields.some(v=>!v.trim()||!Number.isInteger(Number(v))))
    throw Error(`Expected ${count} comma-separated integers`);
  return fields.map(Number);
}
const r=coordinates(values.rect,4);
if(values['background-column']===undefined&&(values['background-sample']!==undefined||values.tolerance!==undefined))
  throw Error('--background-sample and --tolerance require --background-column');
const sample=coordinates(values['background-sample']??'0,0',2);
const background=values['background-column']===undefined?undefined:{
  sourceColumn:Number(values['background-column']),cropX:sample[0],cropY:sample[1],
  tolerance:Number(values.tolerance??32)
};
console.log(JSON.stringify(await registerCleanCropPlate(values.source,values.crop,values.output,{
  rect:{left:r[0],top:r[1],width:r[2],height:r[3]},...(background?{background}:{})
})));
