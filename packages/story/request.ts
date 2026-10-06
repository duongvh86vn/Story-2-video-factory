import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { ZodType, ZodTypeDef } from 'zod';
import type { FactoryConfig, ModelRole } from '../core/config.js';
import { hash, writeJson } from '../core/utils.js';
import type { ModelRequest } from '../models/adapter.js';
import type { ModelRouter } from '../models/registry.js';
import { redact } from '../render/process.js';
import {planningCacheIdentity,reuseAcceptedPlanning} from './planning-cache.js';

/** Router retries syntax/schema failures; this bounded loop repairs domain errors. */
export async function planWithValidation<T, R>(
  root: string, config: FactoryConfig, router: ModelRouter, role: ModelRole,
  stage: string, request: ModelRequest, schema: ZodType<T, ZodTypeDef, any>,
  normalize: (value: T) => R, binding?: unknown, initialRepair?: { previous: unknown; feedback: string }, options?:{reuseAccepted?:boolean},
): Promise<R> {
  if (!/^[a-zA-Z0-9_.-]+$/.test(stage)) throw new Error(`Invalid planning stage ${stage}`);
  const cacheIdentity=planningCacheIdentity(config,role,request,schema,binding);
  if(options?.reuseAccepted&&!initialRepair){const reused=await reuseAcceptedPlanning(root,config,role,stage,request,schema,normalize,binding);if(reused)return reused.result;}
  const dir = path.join(root, 'work', 'attempts', stage, randomUUID());
  let feedback = initialRepair?.feedback ?? '';
  let previous: unknown = initialRepair?.previous;
  const persist=(file:string,value:unknown)=>writeJson(file,JSON.parse(redact(JSON.stringify(value))));
  for (let attempt = 0; attempt <= config.retry.structured_output; attempt++) {
    const input: ModelRequest = {
      ...request,
      prompt: request.prompt + (feedback ? `\n\nDomain validation failed: ${feedback}\nRepair the complete JSON using the original context. Do not change narration.\nPrevious output:\n${JSON.stringify(previous)}` : ''),
    };
    const file = path.join(dir, `${String(attempt + 1).padStart(2, '0')}.json`);
    await persist(file, { attempt: attempt + 1, status: 'started', request: input, promptHash: hash(input), binding });
    let value: T;
    try {
      value = await router.structured(role, input, schema as ZodType<T>);
    } catch (error) {
      await persist(file, { attempt: attempt + 1, status: 'model-failed', request: input, binding, error: String(error) });
      throw error;
    }
    previous = value;
    try {
      const result = normalize(value);
      await persist(file, { attempt: attempt + 1, status: 'accepted', request: input, binding, cacheIdentity, baseRequestHash:hash(request), response: value, result });
      return result;
    } catch (error) {
      feedback = error instanceof Error ? error.message : String(error);
      await persist(file, { attempt: attempt + 1, status: 'domain-rejected', request: input, binding, response: value, error: feedback });
    }
  }
  throw new Error(`${stage}: semantic validation exhausted: ${feedback}`);
}
