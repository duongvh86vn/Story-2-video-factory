import type { AssetManifest, Beat, Chapter, CharacterBible, Narration, ProjectState, Review, Story, Storyboard } from '../../packages/core/schemas.js';
import type { Job } from './jobs.js';

export interface ProjectSummary {
  name: string;
  state: ProjectState['state'];
  updatedAt: string;
  approvals: ProjectState['approvals'];
  busy: boolean;
  job: Job | null;
  error?: string;
}
export interface DownloadInfo { name: string; size: number; modifiedAt: string; editable: boolean; }
export interface ProjectDetail extends ProjectSummary {
  locked: Record<string, boolean>;
  progress: { completed: number; total: number; percent: number; stage: string };
  artifacts: {
    story?: Story; narration?: Narration; chapters?: Chapter[]; beats?: Beat[];
    'character-bible'?: CharacterBible; storyboard?: Storyboard; 'asset-manifest'?: AssetManifest;
    review?: Review; 'cost-report'?: unknown; 'qc-report'?: unknown;
  };
  production: unknown;
  downloads: DownloadInfo[];
  preview: { composition: string | null; draft: string | null; final: string | null; contactSheet: string | null };
  settings: { language: string; format: { width: number; height: number; fps: number }; approvalRequired: { storyboard: boolean; characters: boolean } };
}
export interface ArtifactDocument<T = unknown> { name: string; data: T; revision: string; editable: boolean; }
export interface SceneDocument { shotId: string; files: Array<{ path: string; content: string }>; revision: string; }
export interface UploadedAsset { name: string; path: string; size: number; }
