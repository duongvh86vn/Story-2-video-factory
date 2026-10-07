import type {Command} from 'commander';
import {z} from 'zod';
import {writeMotionMeasurement} from '../../packages/motion/measure.js';

export function addMotionMeasureCommand(cli:Command){
  cli.command('motion-measure <root> <sheet>').description('Write static alpha worksheets from explicit frame/region selections; no anatomy registration or production approval')
    .requiredOption('--layout <file>','Root-relative explicit measurement layout JSON')
    .requiredOption('--output <directory>','Separate root-relative authoring directory (immutable output)')
    .option('--alpha <value>','Alpha occupancy threshold, 1–255','128')
    .action(async(root:string,sheet:string,options:{layout:string;output:string;alpha:string})=>{
      console.log(JSON.stringify(await writeMotionMeasurement(root,sheet,options.layout,options.output,z.coerce.number().int().min(1).max(255).parse(options.alpha)),null,2));
    });
}
