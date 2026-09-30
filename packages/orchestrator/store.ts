import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { ProjectState } from '../core/schemas.js';

export class ProductionStore {
  private db: DatabaseSync;
  constructor(projectRoot: string) {
    mkdirSync(path.join(projectRoot,'work'),{recursive:true});
    this.db=new DatabaseSync(path.join(projectRoot,'work','production.sqlite'));
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, state TEXT NOT NULL, updated_at TEXT NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS jobs (id INTEGER PRIMARY KEY, stage TEXT NOT NULL, status TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT, error TEXT);
      CREATE TABLE IF NOT EXISTS model_calls (id TEXT PRIMARY KEY, role TEXT, model TEXT, duration_ms INTEGER, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS shots (id TEXT PRIMARY KEY, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS renders (id INTEGER PRIMARY KEY, profile TEXT NOT NULL, path TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY, data TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS errors (id INTEGER PRIMARY KEY, stage TEXT, message TEXT NOT NULL, created_at TEXT NOT NULL);`);
  }
  saveState(state: ProjectState): void { this.db.prepare('INSERT OR REPLACE INTO projects VALUES(?,?,?,?)').run(state.name,state.state,state.updatedAt,JSON.stringify(state)); }
  beginJob(stage:string): number { return Number(this.db.prepare('INSERT INTO jobs(stage,status,started_at) VALUES(?,?,?)').run(stage,'running',new Date().toISOString()).lastInsertRowid); }
  finishJob(id:number,error?:string): void { this.db.prepare('UPDATE jobs SET status=?,finished_at=?,error=? WHERE id=?').run(error ? 'failed':'completed',new Date().toISOString(),error ?? null,id); }
  failInterruptedJobs(): void { this.db.prepare("UPDATE jobs SET status='interrupted',finished_at=? WHERE status='running'").run(new Date().toISOString()); }
  recordError(stage:string,message:string): void { this.db.prepare('INSERT INTO errors(stage,message,created_at) VALUES(?,?,?)').run(stage,message,new Date().toISOString()); }
  records(table:'assets'|'shots',items:Array<{id:string}>): void { const insert=this.db.prepare(`INSERT OR REPLACE INTO ${table}(id,data) VALUES(?,?)`); this.db.exec('BEGIN'); try { this.db.exec(`DELETE FROM ${table}`); for (const item of items) insert.run(item.id,JSON.stringify(item)); this.db.exec('COMMIT'); } catch (e) { this.db.exec('ROLLBACK'); throw e; } }
  review(data:unknown): void { this.db.prepare('INSERT INTO reviews(data,created_at) VALUES(?,?)').run(JSON.stringify(data),new Date().toISOString()); }
  render(profile:string,file:string):void { this.db.prepare('INSERT INTO renders(profile,path,created_at) VALUES(?,?,?)').run(profile,file,new Date().toISOString()); }
  modelCall(data:Record<string,unknown>):void { this.db.prepare('INSERT OR REPLACE INTO model_calls VALUES(?,?,?,?,?)').run(String(data.callId ?? data.id ?? `${data.promptHash}:${data.responseHash}:${data.timestamp}`),String(data.role ?? ''),String(data.model ?? ''),Number(data.durationMs ?? 0),JSON.stringify(data)); }
  summary():unknown { return { jobs:this.db.prepare('SELECT * FROM jobs ORDER BY id DESC LIMIT 100').all(), errors:this.db.prepare('SELECT * FROM errors ORDER BY id DESC LIMIT 30').all(), modelCalls:this.db.prepare('SELECT count(*) AS count FROM model_calls').get() }; }
  close():void { this.db.close(); }
}
