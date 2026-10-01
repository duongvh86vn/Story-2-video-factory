import type { AssetManifest, Beat, Chapter, CharacterBible, Narration, ProjectState, Review, Story, Storyboard } from '../../packages/core/schemas.js';
import type { Job } from './jobs.js';
import type { HostProfile, HostRig } from '../../packages/host/schemas.js';
import type { VoiceReport } from '../../packages/voice/schemas.js';
import type { ScriptDocument } from '../../packages/ingest/script.js';
import type { FactoryConfig } from '../../packages/core/config.js';

export interface ProjectSummary {
  name: string;
  state: ProjectState['state'];
  updatedAt: string;
  approvals: ProjectState['approvals'];
  busy: boolean;
  job: Job | null;
  error?: string;
  waitingFor?: ProjectState['waitingFor'];
}
export interface DownloadInfo { name: string; size: number; modifiedAt: string; editable: boolean; }
export interface ProjectDetail extends ProjectSummary {
  locked: Record<string, boolean>;
  progress: { completed: number; total: number; percent: number; stage: string };
  artifacts: {
    story?: Story; narration?: Narration; chapters?: Chapter[]; beats?: Beat[];
    'character-bible'?: CharacterBible; storyboard?: Storyboard; 'asset-manifest'?: AssetManifest;
    review?: Review; 'cost-report'?: unknown; 'qc-report'?: unknown;
    script?: ScriptDocument; 'voiced-narration'?: Narration; 'voice-report'?: VoiceReport; 'host-profile'?: HostProfile; 'host-rig'?: HostRig; 'host-timeline'?: unknown; 'explanation-plan'?: unknown;
  };
  production: unknown;
  downloads: DownloadInfo[];
  preview: { composition: string | null; draft: string | null; final: string | null; contactSheet: string | null };
  settings: { revision: string; language: string; contentMode: FactoryConfig['content']['mode']; input: FactoryConfig['input']; host: FactoryConfig['host']; voice: Omit<FactoryConfig['voice'],'command'|'command_args'>; automatic: boolean;
    format: { width: number; height: number; fps: number }; approvalRequired: { storyboard: boolean; characters: boolean; host: boolean } };
}
export interface ArtifactDocument<T = unknown> { name: string; data: T; revision: string; editable: boolean; }
export interface SceneDocument { shotId: string; files: Array<{ path: string; content: string }>; revision: string; }
export interface UploadedAsset { name: string; path: string; size: number; }
