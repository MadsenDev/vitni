import { useMemo } from 'react';

type GraphNode = { id: string; type: string; label?: string | null; properties?: Record<string, unknown> };
type GraphEdge = { id: string; src_id: string; dst_id: string; type: string; properties?: Record<string, unknown> };

interface TimelineOverlayProps {
  open: boolean;
  onClose: () => void;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

type TimelineEvent = { id: string; date: string; sortKey: number; text: string };

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toLocaleDateString();
  } catch {}
  return dateStr;
}

export function TimelineOverlay({ open, onClose, nodes, edges }: TimelineOverlayProps) {
  const nodeById = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  const events = useMemo<TimelineEvent[]>(() => {
    const out: TimelineEvent[] = [];

    const fullName = (n: GraphNode | undefined) => n?.label || 'Unknown';
    const get = (props: Record<string, unknown> | undefined, key: string) => (props?.[key] as string | undefined) || '';

    // Person births
    for (const n of nodes) {
      if (n.type === 'person') {
        const dob = get(n.properties, 'birthdate') || get(n.properties, 'date_of_birth') || get(n.properties, 'dob');
        if (dob) {
          out.push({
            id: `birth:${n.id}`,
            date: dob,
            sortKey: Date.parse(dob) || 0,
            text: `${fullName(n)} was born ${formatDate(dob)}.`
          });
        }
      }
    }

    // Helper to build narrative per relationship
    const relationText = (type: string, subtype: string | undefined, A: string, B: string, date: string) => {
      const d = formatDate(date);
      switch (type) {
        case 'related_to': {
          switch (subtype) {
            case 'parent_of': return `${A} became parent of ${B} ${d}.`;
            case 'child_of': return `${A} became child of ${B} ${d}.`;
            case 'sibling_of': return `${A} became sibling of ${B} ${d}.`;
            case 'spouse_of': return `${A} married ${B} ${d}.`;
            case 'associate_of': return `${A} became associated with ${B} ${d}.`;
            default: return `${A} became related to ${B} ${d}.`;
          }
        }
        case 'works_for':
          return `${A} started working for ${B} ${d}.`;
        case 'located_at':
          return `${A} was located at ${B} ${d}.`;
        case 'attended': {
          switch (subtype) {
            case 'organized': return `${A} organized ${B} ${d}.`;
            case 'spoke_at': return `${A} spoke at ${B} ${d}.`;
            default: return `${A} attended ${B} ${d}.`;
          }
        }
        case 'mentioned_in': {
          switch (subtype) {
            case 'cited_in': return `${A} was cited in ${B} ${d}.`;
            case 'named_in': return `${A} was named in ${B} ${d}.`;
            default: return `${A} was mentioned in ${B} ${d}.`;
          }
        }
        case 'communicated_with': {
          switch (subtype) {
            case 'called': return `${A} called ${B} ${d}.`;
            case 'emailed': return `${A} emailed ${B} ${d}.`;
            case 'messaged': return `${A} messaged ${B} ${d}.`;
            case 'met_with': return `${A} met with ${B} ${d}.`;
            default: return `${A} communicated with ${B} ${d}.`;
          }
        }
        case 'paid': {
          switch (subtype) {
            case 'received_from': return `${A} received payment from ${B} ${d}.`;
            case 'donated_to': return `${A} donated to ${B} ${d}.`;
            default: return `${A} paid ${B} ${d}.`;
          }
        }
        case 'investigated': {
          switch (subtype) {
            case 'researched': return `${A} researched ${B} ${d}.`;
            case 'audited': return `${A} audited ${B} ${d}.`;
            default: return `${A} investigated ${B} ${d}.`;
          }
        }
        case 'knows': {
          switch (subtype) {
            case 'friend_of': return `${A} became friends with ${B} ${d}.`;
            case 'colleague_of': return `${A} became colleagues with ${B} ${d}.`;
            case 'neighbor_of': return `${A} became neighbors with ${B} ${d}.`;
            default: return `${A} came to know ${B} ${d}.`;
          }
        }
        case 'member_of': {
          switch (subtype) {
            case 'member_of': return `${A} became a member of ${B} ${d}.`;
            case 'affiliate_of': return `${A} affiliated with ${B} ${d}.`;
            default: return `${A} joined ${B} ${d}.`;
          }
        }
        case 'called':
          return `${A} called ${B} ${d}.`;
        case 'emailed':
          return `${A} emailed ${B} ${d}.`;
        case 'visited':
          return `${A} visited ${B} ${d}.`;
        case 'protected':
          return `${A} protected ${B} ${d}.`;
        case 'threatened':
          return `${A} threatened ${B} ${d}.`;
        default: {
          if (subtype) return `${A} ${subtype.replaceAll('_', ' ')} ${B} ${d}.`;
          return `${A} ${type.replaceAll('_', ' ')} ${B} ${d}.`;
        }
      }
    };

    // Relationship events with dates
    for (const e of edges) {
      const date = get(e.properties, 'date') || get(e.properties, 'created_at');
      if (!date) continue;
      const a = nodeById.get(e.src_id);
      const b = nodeById.get(e.dst_id);
      const A = fullName(a);
      const B = fullName(b);
      const subtype = get(e.properties, 'subtype');
      const text = relationText(e.type, subtype, A, B, date);
      out.push({ id: e.id, date, sortKey: Date.parse(date) || 0, text });
    }

    return out
      .filter(ev => !!ev.date)
      .sort((a, b) => a.sortKey - b.sortKey);
  }, [nodes, edges, nodeById]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/60">
      <div className="absolute inset-6 rounded-xl border border-slate-800 bg-slate-950/95 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Timeline</h2>
          <button
            onClick={onClose}
            className="rounded bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
          >
            Close
          </button>
        </div>
        <div className="h-[calc(100%-64px)] overflow-y-auto px-6 py-4">
          {events.length === 0 ? (
            <p className="text-slate-400">No dated events yet. Add dates to relationships or person birthdates.</p>
          ) : (
            <ul className="space-y-3">
              {events.map((ev) => (
                <li key={ev.id} className="flex gap-4">
                  <div className="w-28 shrink-0 text-right text-sm text-slate-400">{formatDate(ev.date)}</div>
                  <div className="relative pl-4">
                    <div className="absolute left-0 top-2 h-2 w-2 -translate-x-1/2 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.6)]" />
                    <div className="text-slate-200">{ev.text}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}


