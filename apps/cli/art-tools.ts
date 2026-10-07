#!/usr/bin/env node
import {Command} from 'commander';
import {addMotionMeasureCommand} from './motion-measure-command.js';

const cli=new Command().name('video-factory-art').description('Offline artwork measurements; no production coordinator or provider calls.');
addMotionMeasureCommand(cli);
await cli.parseAsync(process.argv);
