import path from 'node:path';
import { ProjectStateSchema, States, type ProjectState, type ProjectStatus } from '../core/schemas.js';
import { exists, readJson, writeJson } from '../core/utils.js';

export const stateIndex=(state:ProjectStatus):number => States.indexOf(state);
export async function loadState(projectRoot:string):Promise<ProjectState> { const file=path.join(projectRoot,'project-state.json'); return await exists(file) ? readJson(file,ProjectStateSchema) : ProjectStateSchema.parse({version:1,name:path.basename(projectRoot),state:'NEW',updatedAt:new Date().toISOString(),inputHash:''}); }
export async function saveState(projectRoot:string,state:ProjectState):Promise<void> { state.updatedAt=new Date().toISOString(); await writeJson(path.join(projectRoot,'project-state.json'),ProjectStateSchema.parse(state)); }
export function transition(state:ProjectState,next:ProjectStatus):void { if (stateIndex(next)!==stateIndex(state.state)+1) throw new Error(`Invalid project transition ${state.state} -> ${next}`); state.state=next; delete state.error; delete state.waitingFor; }
export class ApprovalRequired extends Error { constructor(public kind:'storyboard'|'characters'|'host'|'voice'|'source-review', message?:string) { super(message ?? `${kind} approval is required before production can continue`); this.name='ApprovalRequired'; } }
