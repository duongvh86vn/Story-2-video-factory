export interface ValidationResult { pass:boolean; errors:string[]; diagnostics?:unknown[]; }
export interface RenderResult { path:string; profile:'draft'|'final'; renderer:string; version:string; code:number; cacheKey:string; }
export interface SnapshotRequest { project:string; timeMs:number; output:string; }
export interface VideoEngine {
  validate(project?:string):Promise<ValidationResult>;
  snapshot(request:SnapshotRequest):Promise<string>;
  renderDraft(project?:string):Promise<RenderResult>;
  renderFinal(project?:string):Promise<RenderResult>;
  preview(project?:string):Promise<unknown>;
}
export type RenderEngine=VideoEngine;
