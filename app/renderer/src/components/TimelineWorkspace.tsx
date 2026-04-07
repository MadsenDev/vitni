import { useMemo } from 'react';
import { ThemedBadge, ThemedCard, ThemedSection } from '@renderer/features/personalization/primitives';

type GraphNode = { id: string; type: string; label?: string | null; properties?: Record<string, unknown> };
type GraphEdge = { id: string; src_id: string; dst_id: string; type: string; properties?: Record<string, unknown> };

interface TimelineWorkspaceProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

type TimelineEvent = {
  id: string;
  date: string;
  sortKey: number;
  text: string;
  subject: string;
  category: string;
  sourceKind: 'entity' | 'relationship';
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (!Number.isNaN(d.getTime())) return d.toLocaleDateString();
  return dateStr;
}

function eventTone(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes('incident')) return 'warning' as const;
  if (normalized.includes('payment') || normalized.includes('paid') || normalized.includes('transaction')) {
    return 'success' as const;
  }
  if (normalized.includes('call') || normalized.includes('email') || normalized.includes('message') || normalized.includes('communication')) {
    return 'accent' as const;
  }
  return 'default' as const;
}

export function TimelineWorkspace({ nodes, edges }: TimelineWorkspaceProps) {
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const get = (props: Record<string, unknown> | undefined, key: string) => (props?.[key] as string | undefined) || '';
  const name = (node: GraphNode | undefined) => node?.label || 'Unknown';

  const events = useMemo<TimelineEvent[]>(() => {
    const out: TimelineEvent[] = [];

    for (const node of nodes) {
      if (node.type === 'person') {
        const dob = get(node.properties, 'birthdate') || get(node.properties, 'date_of_birth') || get(node.properties, 'dob');
        if (dob) {
          out.push({
            id: `birth:${node.id}`,
            date: dob,
            sortKey: Date.parse(dob) || 0,
            text: `${name(node)} was born ${formatDate(dob)}.`,
            subject: name(node),
            category: 'Profile',
            sourceKind: 'entity'
          });
        }
      }

      if (node.type === 'event' || node.type === 'incident') {
        const eventDate = get(node.properties, 'date') || get(node.properties, 'startDate') || get(node.properties, 'occurred_at');
        if (eventDate) {
          out.push({
            id: `event:${node.id}`,
            date: eventDate,
            sortKey: Date.parse(eventDate) || 0,
            text: `${name(node)} was recorded on ${formatDate(eventDate)}.`,
            subject: name(node),
            category: node.type === 'incident' ? 'Incident' : 'Event',
            sourceKind: 'entity'
          });
        }
      }
    }

    const relationText = (type: string, subtype: string | undefined, A: string, B: string, date: string) => {
      const d = formatDate(date);
      switch (type) {
        case 'related_to':
          switch (subtype) {
            case 'parent_of': return `${A} became parent of ${B} ${d}.`;
            case 'child_of': return `${A} became child of ${B} ${d}.`;
            case 'sibling_of': return `${A} became sibling of ${B} ${d}.`;
            case 'spouse_of': return `${A} married ${B} ${d}.`;
            case 'associate_of': return `${A} became associated with ${B} ${d}.`;
            default: return `${A} became related to ${B} ${d}.`;
          }
        case 'works_for': return `${A} started working for ${B} ${d}.`;
        case 'located_at': return `${A} was located at ${B} ${d}.`;
        case 'attended':
          switch (subtype) {
            case 'organized': return `${A} organized ${B} ${d}.`;
            case 'spoke_at': return `${A} spoke at ${B} ${d}.`;
            default: return `${A} attended ${B} ${d}.`;
          }
        case 'mentioned_in':
          switch (subtype) {
            case 'cited_in': return `${A} was cited in ${B} ${d}.`;
            case 'named_in': return `${A} was named in ${B} ${d}.`;
            default: return `${A} was mentioned in ${B} ${d}.`;
          }
        case 'communicated_with':
          switch (subtype) {
            case 'called': return `${A} called ${B} ${d}.`;
            case 'emailed': return `${A} emailed ${B} ${d}.`;
            case 'messaged': return `${A} messaged ${B} ${d}.`;
            case 'met_with': return `${A} met with ${B} ${d}.`;
            default: return `${A} communicated with ${B} ${d}.`;
          }
        case 'paid':
          switch (subtype) {
            case 'received_from': return `${A} received payment from ${B} ${d}.`;
            case 'donated_to': return `${A} donated to ${B} ${d}.`;
            default: return `${A} paid ${B} ${d}.`;
          }
        case 'investigated':
          switch (subtype) {
            case 'researched': return `${A} researched ${B} ${d}.`;
            case 'audited': return `${A} audited ${B} ${d}.`;
            default: return `${A} investigated ${B} ${d}.`;
          }
        case 'knows':
          switch (subtype) {
            case 'friend_of': return `${A} became friends with ${B} ${d}.`;
            case 'colleague_of': return `${A} became colleagues with ${B} ${d}.`;
            case 'neighbor_of': return `${A} became neighbors with ${B} ${d}.`;
            default: return `${A} came to know ${B} ${d}.`;
          }
        case 'member_of':
          switch (subtype) {
            case 'member_of': return `${A} became a member of ${B} ${d}.`;
            case 'affiliate_of': return `${A} affiliated with ${B} ${d}.`;
            default: return `${A} joined ${B} ${d}.`;
          }
        case 'ownership':
          switch (subtype) {
            case 'owns': return `${A} owned ${B} ${d}.`;
            case 'leases': return `${A} leased ${B} ${d}.`;
            case 'borrowed': return `${A} borrowed ${B} ${d}.`;
            case 'assigned_to': return `${B} was assigned to ${A} ${d}.`;
            default: return `${A} had ownership of ${B} ${d}.`;
          }
        case 'called': return `${A} called ${B} ${d}.`;
        case 'emailed': return `${A} emailed ${B} ${d}.`;
        case 'visited': return `${A} visited ${B} ${d}.`;
        case 'protected': return `${A} protected ${B} ${d}.`;
        case 'threatened': return `${A} threatened ${B} ${d}.`;
        default: return subtype ? `${A} ${subtype.replaceAll('_', ' ')} ${B} ${d}.` : `${A} ${type.replaceAll('_', ' ')} ${B} ${d}.`;
      }
    };

    for (const edge of edges) {
      const date = get(edge.properties, 'date') || get(edge.properties, 'created_at');
      if (!date) continue;
      const a = nodeById.get(edge.src_id);
      const b = nodeById.get(edge.dst_id);
      const A = name(a);
      const B = name(b);
      const subtype = get(edge.properties, 'subtype');
      out.push({
        id: edge.id,
        date,
        sortKey: Date.parse(date) || 0,
        text: relationText(edge.type, subtype, A, B, date),
        subject: A,
        category: subtype ? subtype.replaceAll('_', ' ') : edge.type.replaceAll('_', ' '),
        sourceKind: 'relationship'
      });
    }

    return out.sort((a, b) => a.sortKey - b.sortKey);
  }, [nodes, edges, nodeById]);

  const totalDates = useMemo(() => new Set(events.map((event) => event.date)).size, [events]);
  const relationshipEvents = useMemo(() => events.filter((event) => event.sourceKind === 'relationship').length, [events]);
  const explicitEvents = useMemo(() => events.filter((event) => event.sourceKind === 'entity').length, [events]);

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-elevated)' }}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>Timeline workspace</p>
            <h1 className="mt-2 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Analyze the chronology of the case</h1>
            <p className="mt-2 max-w-3xl text-sm" style={{ color: 'var(--text-muted)' }}>
              Use the timeline to spot sequence, escalation, and gaps in the narrative, not just to list dated records.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: 'Events', value: events.length },
              { label: 'Dates', value: totalDates },
              { label: 'Linked activity', value: relationshipEvents },
              { label: 'Named events', value: explicitEvents }
            ].map((metric) => (
              <ThemedCard key={metric.label} className="px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>{metric.label}</div>
                <div className="mt-2 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{metric.value}</div>
              </ThemedCard>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {events.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No dated activity yet. Add dates to events, incidents, relationships, or profile records to build the chronology.</p>
        ) : (
          <ul className="space-y-4">
            {events.map((event) => (
              <li key={event.id} className="flex gap-4">
                <div className="w-28 shrink-0 text-right text-sm" style={{ color: 'var(--text-muted)' }}>{formatDate(event.date)}</div>
                <div className="relative min-w-0 flex-1 pl-5">
                  <div className="absolute bottom-0 left-0 top-2 w-px" style={{ background: 'var(--border-subtle)' }} />
                  <div className="absolute left-0 top-2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.6)]" />
                  <ThemedSection className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <ThemedBadge tone={eventTone(event.category)}>
                        {event.category}
                      </ThemedBadge>
                      <ThemedBadge tone="accent">
                        {event.sourceKind === 'relationship' ? 'Linked activity' : 'Named record'}
                      </ThemedBadge>
                    </div>
                    <div className="mt-3 text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--text-soft)' }}>{event.subject}</div>
                    <div className="mt-2 text-sm leading-6" style={{ color: 'var(--text-primary)' }}>{event.text}</div>
                  </ThemedSection>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
