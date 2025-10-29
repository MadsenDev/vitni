export interface GraphNodeSnapshot {
  id: string;
  type: string;
  label: string | null;
  properties: Record<string, unknown>;
  created_at: number;
  updated_at: number;
  pos_x?: number | null;
  pos_y?: number | null;
}

export interface GraphEdgeSnapshot {
  id: string;
  src_id: string;
  dst_id: string;
  type: string;
  properties: Record<string, unknown>;
  created_at: number;
  updated_at: number;
}

export interface GraphSnapshot {
  nodes: GraphNodeSnapshot[];
  edges: GraphEdgeSnapshot[];
}
