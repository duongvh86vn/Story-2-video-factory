import {z} from 'zod';
import type {ModelSettings} from '../core/config.js';

export const NINE_ROUTER_URL='http://127.0.0.1:20128/v1';
export const NINE_ROUTER_MODEL='cx/gpt-6.1-sol';
export function nineRouterSettings(model=NINE_ROUTER_MODEL):Partial<ModelSettings> {
  return {provider:'gateway',model,base_url:NINE_ROUTER_URL,api_key_env:'MODEL_GATEWAY_KEY',vision:false,timeout_ms:180000};
}
/** Discovery is not proof of quota, generation access or image capabilities. */
export async function discoverNineRouter():Promise<{url:string;models:string[];keyConfigured:boolean}> {
  const key=process.env.MODEL_GATEWAY_KEY;
  const response=await fetch(`${NINE_ROUTER_URL}/models`,{headers:key?{Authorization:`Bearer ${key}`}:{},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error(`9router discovery HTTP ${response.status}`);
  const data=z.object({data:z.array(z.object({id:z.string().min(1)}))}).parse(await response.json());
  return {url:NINE_ROUTER_URL,models:[...new Set(data.data.map(m=>m.id))].sort(),keyConfigured:!!key};
}
export function topicModelDefaults():Record<string,Partial<ModelSettings>> {
  // This default model was verified with an actual static-image review locally.
  // Other user-selected models still need their own vision capability check.
  return Object.fromEntries(['planner','storyboard','coder','repair','visual_review','fallback'].map(role=>[role,{...nineRouterSettings(),vision:role==='visual_review'}]));
}
