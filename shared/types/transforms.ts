export interface TransformManifest {
  id: string;
  name: string;
  input: Array<Record<string, unknown>>;
  network?: {
    kind: string;
    host: string;
    path: string;
    method?: string;
    sends?: string[];
    receives?: string[];
  };
  outputs?: Array<Record<string, unknown>>;
}

export interface TransformRegistry {
  local: TransformManifest[];
  remote: TransformManifest[];
}
