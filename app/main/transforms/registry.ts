import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { z } from 'zod';
import type { TransformManifest, TransformRegistry } from '../../../shared/types';

const transformManifestSchema: z.ZodType<TransformManifest> = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  appliesTo: z.array(z.string()).optional(),
  input: z.array(z.record(z.string(), z.unknown())),
  network: z
    .object({
      kind: z.string(),
      host: z.string(),
      path: z.string(),
      method: z.string().optional(),
      sends: z.array(z.string()).optional(),
      receives: z.array(z.string()).optional()
    })
    .optional(),
  outputs: z.array(z.record(z.string(), z.unknown())).optional()
});

function resolveTransformRoot(): string {
  const candidates = [
    path.resolve(__dirname, '../../../transforms'),
    path.resolve(__dirname, '../../../../transforms'),
    path.resolve(app.getAppPath(), 'transforms'),
    path.resolve(process.cwd(), 'transforms')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[candidates.length - 1];
}

const TRANSFORM_ROOT = resolveTransformRoot();
const LOCAL_DIR = path.join(TRANSFORM_ROOT, 'local');
const REMOTE_DIR = path.join(TRANSFORM_ROOT, 'remote');

function loadManifests(dir: string): TransformManifest[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      return transformManifestSchema.parse(raw);
    });
}

export function createTransformRegistry(): TransformRegistry {
  return {
    local: loadManifests(LOCAL_DIR),
    remote: loadManifests(REMOTE_DIR)
  };
}
