import { useEffect, useMemo, useRef } from 'react';
import { ThemedBadge, ThemedSection } from '@renderer/features/personalization/primitives';
import type { TimelineMeta } from './TimelineSidebar';

type GraphNode = { id: string; type: string; label?: string | null; properties?: Record<string, unknown> };
type GraphEdge = { id: string; src_id: string; dst_id: string; type: string; properties?: Record<string, unknown> };

interface TimelineWorkspaceProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  entityFilter: string;
  bucketFilter: string;
  dateFrom: string;
  dateTo: string;
  onMetadata?: (meta: TimelineMeta) => void;
}

type TimelineEvent = {
  id: string;
  date: string;
  sortKey: number;
  text: string;
  subject: string;
  category: string;
  bucketCategory: string;
  sourceKind: 'entity' | 'relationship';
  primaryNodeId: string | null;
  relatedNodeIds: string[];
};

type DateGroup = { dateStr: string; sortKey: number; events: TimelineEvent[] };
type MonthGroup = { year: number; month: number; label: string; dates: DateGroup[] };
type YearGroup = { year: number; months: MonthGroup[] };

const GAP_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (!Number.isNaN(d.getTime())) return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  return dateStr;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  if (!Number.isNaN(d.getTime())) return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return dateStr;
}

function formatGap(ms: number): string {
  const days = Math.round(ms / (24 * 60 * 60 * 1000));
  if (days < 60) return `${days}-day gap`;
  const months = Math.round(days / 30);
  if (months < 24) return `${months}-month gap`;
  return `${Math.round(days / 365)}-year gap`;
}

function bucketCategory(category: string, edgeType: string): string {
  const c = category.toLowerCase();
  const t = edgeType.toLowerCase();
  if (c.includes('call') || c.includes('email') || c.includes('message') || c.includes('met') ||
      c.includes('communic') || t === 'called' || t === 'emailed' || t === 'communicated_with') return 'Communication';
  if (c.includes('paid') || c.includes('payment') || c.includes('transaction') ||
      c.includes('ownership') || c.includes('donated') || c.includes('received') || t === 'paid') return 'Financial';
  if (c.includes('incident') || t === 'incident') return 'Incident';
  if (c.includes('profile') || c.includes('birth')) return 'Profile';
  if (c.includes('event') || t === 'event') return 'Event';
  return 'Activity';
}

function eventTone(bucket: string) {
  switch (bucket) {
    case 'Incident': return 'warning' as const;
    case 'Financial': return 'success' as const;
    case 'Communication': return 'accent' as const;
    default: return 'default' as const;
  }
}

function relationText(type: string, subtype: string | undefined, A: string, B: string, date: string): string {
  const d = formatDate(date);
  switch (type) {
    case 'related_to':
      switch (subtype) {
        case 'parent_of': return `${A} became parent of ${B} on ${d}.`;
        case 'child_of': return `${A} became child of ${B} on ${d}.`;
        case 'sibling_of': return `${A} became sibling of ${B} on ${d}.`;
        case 'spouse_of': return `${A} married ${B} on ${d}.`;
        case 'associate_of': return `${A} became associated with ${B} on ${d}.`;
        default: return `${A} became related to ${B} on ${d}.`;
      }
    case 'works_for': return `${A} started working for ${B} on ${d}.`;
    case 'located_at': return `${A} was located at ${B} on ${d}.`;
    case 'attended':
      switch (subtype) {
        case 'organized': return `${A} organized ${B} on ${d}.`;
        case 'spoke_at': return `${A} spoke at ${B} on ${d}.`;
        default: return `${A} attended ${B} on ${d}.`;
      }
    case 'mentioned_in':
      switch (subtype) {
        case 'cited_in': return `${A} was cited in ${B} on ${d}.`;
        case 'named_in': return `${A} was named in ${B} on ${d}.`;
        default: return `${A} was mentioned in ${B} on ${d}.`;
      }
    case 'communicated_with':
      switch (subtype) {
        case 'called': return `${A} called ${B} on ${d}.`;
        case 'emailed': return `${A} emailed ${B} on ${d}.`;
        case 'messaged': return `${A} messaged ${B} on ${d}.`;
        case 'met_with': return `${A} met with ${B} on ${d}.`;
        default: return `${A} communicated with ${B} on ${d}.`;
      }
    case 'paid':
      switch (subtype) {
        case 'received_from': return `${A} received payment from ${B} on ${d}.`;
        case 'donated_to': return `${A} donated to ${B} on ${d}.`;
        default: return `${A} paid ${B} on ${d}.`;
      }
    case 'investigated':
      switch (subtype) {
        case 'researched': return `${A} researched ${B} on ${d}.`;
        case 'audited': return `${A} audited ${B} on ${d}.`;
        default: return `${A} investigated ${B} on ${d}.`;
      }
    case 'knows':
      switch (subtype) {
        case 'friend_of': return `${A} became friends with ${B} on ${d}.`;
        case 'colleague_of': return `${A} became colleagues with ${B} on ${d}.`;
        case 'neighbor_of': return `${A} became neighbors with ${B} on ${d}.`;
        default: return `${A} came to know ${B} on ${d}.`;
      }
    case 'member_of':
      switch (subtype) {
        case 'affiliate_of': return `${A} affiliated with ${B} on ${d}.`;
        default: return `${A} joined ${B} on ${d}.`;
      }
    case 'ownership':
      switch (subtype) {
        case 'owns': return `${A} owned ${B} as of ${d}.`;
        case 'leases': return `${A} leased ${B} as of ${d}.`;
        case 'borrowed': return `${A} borrowed ${B} on ${d}.`;
        case 'assigned_to': return `${B} was assigned to ${A} on ${d}.`;
        default: return `${A} had ownership of ${B} as of ${d}.`;
      }
    case 'called': return `${A} called ${B} on ${d}.`;
    case 'emailed': return `${A} emailed ${B} on ${d}.`;
    case 'visited': return `${A} visited ${B} on ${d}.`;
    case 'protected': return `${A} protected ${B} on ${d}.`;
    case 'threatened': return `${A} threatened ${B} on ${d}.`;
    default:
      return subtype
        ? `${A} ${subtype.replaceAll('_', ' ')} ${B} on ${d}.`
        : `${A} ${type.replaceAll('_', ' ')} ${B} on ${d}.`;
  }
}

export function TimelineWorkspace({
  nodes, edges, selectedNodeId, onSelectNode,
  entityFilter, bucketFilter, dateFrom, dateTo,
  onMetadata,
}: TimelineWorkspaceProps) {
  const onMetadataRef = useRef(onMetadata);
  onMetadataRef.current = onMetadata;

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const get = (props: Record<string, unknown> | undefined, key: string) => (props?.[key] as string | undefined) || '';
  const name = (node: GraphNode | undefined) => node?.label || 'Unknown';

  const allEvents = useMemo<TimelineEvent[]>(() => {
    const out: TimelineEvent[] = [];

    for (const node of nodes) {
      if (node.type === 'person') {
        const dob = get(node.properties, 'birthdate') || get(node.properties, 'date_of_birth') || get(node.properties, 'dob');
        if (dob) {
          out.push({
            id: `birth:${node.id}`,
            date: dob,
            sortKey: Date.parse(dob) || 0,
            text: `${name(node)} was born on ${formatDate(dob)}.`,
            subject: name(node),
            category: 'Profile',
            bucketCategory: 'Profile',
            sourceKind: 'entity',
            primaryNodeId: node.id,
            relatedNodeIds: [node.id],
          });
        }
      }

      if (node.type === 'event' || node.type === 'incident') {
        const eventDate = get(node.properties, 'date') || get(node.properties, 'startDate') || get(node.properties, 'occurred_at');
        if (eventDate) {
          const cat = node.type === 'incident' ? 'Incident' : 'Event';
          out.push({
            id: `event:${node.id}`,
            date: eventDate,
            sortKey: Date.parse(eventDate) || 0,
            text: `${name(node)} was recorded on ${formatDate(eventDate)}.`,
            subject: name(node),
            category: cat,
            bucketCategory: bucketCategory(cat, node.type),
            sourceKind: 'entity',
            primaryNodeId: node.id,
            relatedNodeIds: [node.id],
          });
        }
      }
    }

    for (const edge of edges) {
      const date = get(edge.properties, 'date') || get(edge.properties, 'created_at');
      if (!date) continue;
      const a = nodeById.get(edge.src_id);
      const b = nodeById.get(edge.dst_id);
      const A = name(a);
      const B = name(b);
      const subtype = get(edge.properties, 'subtype') || undefined;
      const cat = subtype ? subtype.replaceAll('_', ' ') : edge.type.replaceAll('_', ' ');
      out.push({
        id: edge.id,
        date,
        sortKey: Date.parse(date) || 0,
        text: relationText(edge.type, subtype, A, B, date),
        subject: A,
        category: cat,
        bucketCategory: bucketCategory(cat, edge.type),
        sourceKind: 'relationship',
        primaryNodeId: edge.src_id,
        relatedNodeIds: [edge.src_id, edge.dst_id],
      });
    }

    return out.sort((a, b) => a.sortKey - b.sortKey);
  }, [nodes, edges, nodeById]);

  const entityOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const ev of allEvents) {
      if (ev.primaryNodeId && !seen.has(ev.primaryNodeId)) {
        seen.set(ev.primaryNodeId, ev.subject);
      }
      if (ev.sourceKind === 'relationship') {
        for (const nid of ev.relatedNodeIds) {
          if (!seen.has(nid)) {
            const node = nodeById.get(nid);
            if (node) seen.set(nid, name(node));
          }
        }
      }
    }
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allEvents, nodeById]);

  const buckets = useMemo(() => {
    const seen = new Set<string>();
    for (const ev of allEvents) seen.add(ev.bucketCategory);
    return ['All', ...Array.from(seen).sort()];
  }, [allEvents]);

  const dateFromMs = useMemo(() => dateFrom ? Date.parse(dateFrom) : null, [dateFrom]);
  const dateToMs = useMemo(() => dateTo ? Date.parse(dateTo) : null, [dateTo]);

  const filtered = useMemo(() => {
    return allEvents.filter((ev) => {
      if (entityFilter && !ev.relatedNodeIds.includes(entityFilter)) return false;
      if (bucketFilter !== 'All' && ev.bucketCategory !== bucketFilter) return false;
      if (dateFromMs !== null && ev.sortKey < dateFromMs) return false;
      if (dateToMs !== null && ev.sortKey > dateToMs) return false;
      return true;
    });
  }, [allEvents, entityFilter, bucketFilter, dateFromMs, dateToMs]);

  const grouped = useMemo<YearGroup[]>(() => {
    const years = new Map<number, Map<number, Map<string, TimelineEvent[]>>>();

    for (const ev of filtered) {
      const d = new Date(ev.sortKey || Date.parse(ev.date));
      const y = Number.isNaN(d.getTime()) ? 0 : d.getFullYear();
      const m = Number.isNaN(d.getTime()) ? 0 : d.getMonth();
      const dateKey = Number.isNaN(d.getTime()) ? ev.date : d.toISOString().slice(0, 10);

      if (!years.has(y)) years.set(y, new Map());
      const months = years.get(y)!;
      if (!months.has(m)) months.set(m, new Map());
      const dates = months.get(m)!;
      if (!dates.has(dateKey)) dates.set(dateKey, []);
      dates.get(dateKey)!.push(ev);
    }

    return Array.from(years.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, months]) => ({
        year,
        months: Array.from(months.entries())
          .sort(([a], [b]) => a - b)
          .map(([month, dates]) => ({
            year,
            month,
            label: year === 0 ? 'Unknown date' : MONTH_NAMES[month],
            dates: Array.from(dates.entries())
              .sort(([a], [b]) => Date.parse(a) - Date.parse(b))
              .map(([dateStr, events]) => ({
                dateStr,
                sortKey: Date.parse(dateStr) || 0,
                events,
              })),
          })),
      }));
  }, [filtered]);

  const flatDates = useMemo<DateGroup[]>(() => grouped.flatMap((y) => y.months.flatMap((m) => m.dates)), [grouped]);

  const totalEvents = allEvents.length;
  const filteredCount = filtered.length;
  const uniqueDates = new Set(filtered.map((e) => e.date)).size;
  const relCount = filtered.filter((e) => e.sourceKind === 'relationship').length;
  const span = flatDates.length >= 2
    ? (() => {
        const ms = flatDates[flatDates.length - 1].sortKey - flatDates[0].sortKey;
        const days = Math.round(ms / 86400000);
        return days < 60 ? `${days}d` : days < 730 ? `${Math.round(days / 30)}mo` : `${Math.round(days / 365)}yr`;
      })()
    : '—';

  useEffect(() => {
    onMetadataRef.current?.({ entityOptions, buckets, filteredCount, totalEvents, uniqueDates, relCount, span });
  }, [entityOptions, buckets, filteredCount, totalEvents, uniqueDates, relCount, span]);

  const isRelated = (ev: TimelineEvent) => selectedNodeId != null && ev.relatedNodeIds.includes(selectedNodeId);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-elevated)' }}>
        <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>Timeline workspace</p>
        <h1 className="mt-1 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Chronology of the case</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {filtered.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {allEvents.length === 0
                ? 'No dated activity yet. Add dates to events, relationships, or profile records.'
                : 'No events match the current filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map((yearGroup, yi) => (
              <div key={yearGroup.year}>
                <div className="mb-5 flex items-center gap-4">
                  <span className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--text-soft)' }}>
                    {yearGroup.year === 0 ? 'Unknown year' : yearGroup.year}
                  </span>
                  <div className="flex-1" style={{ height: 1, background: 'var(--border-subtle)' }} />
                </div>

                <div className="space-y-6">
                  {yearGroup.months.map((monthGroup, mi) => {
                    const firstDate = monthGroup.dates[0];
                    let gapLabel: string | null = null;

                    const prevDateGroup = (() => {
                      if (mi > 0) return monthGroup.dates[0];
                      if (yi > 0) {
                        const prevYear = grouped[yi - 1];
                        const lastMonth = prevYear.months[prevYear.months.length - 1];
                        return lastMonth.dates[lastMonth.dates.length - 1];
                      }
                      return null;
                    })();

                    if (mi > 0) {
                      const prevMonth = yearGroup.months[mi - 1];
                      const prevLast = prevMonth.dates[prevMonth.dates.length - 1];
                      const gap = firstDate.sortKey - prevLast.sortKey;
                      if (gap > GAP_THRESHOLD_MS) gapLabel = formatGap(gap);
                    } else if (yi > 0 && prevDateGroup) {
                      const gap = firstDate.sortKey - prevDateGroup.sortKey;
                      if (gap > GAP_THRESHOLD_MS) gapLabel = formatGap(gap);
                    }

                    return (
                      <div key={`${yearGroup.year}-${monthGroup.month}`}>
                        {gapLabel && (
                          <div className="my-4 flex items-center gap-3">
                            <div className="flex-1" style={{ height: 1, background: 'var(--border-subtle)', opacity: 0.4 }} />
                            <span className="rounded-full px-3 py-0.5 text-[11px] font-medium" style={{
                              background: 'rgba(239,68,68,0.08)',
                              border: '1px solid rgba(239,68,68,0.2)',
                              color: 'rgba(239,68,68,0.7)',
                            }}>
                              {gapLabel}
                            </span>
                            <div className="flex-1" style={{ height: 1, background: 'var(--border-subtle)', opacity: 0.4 }} />
                          </div>
                        )}

                        <div className="mb-3 text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                          {monthGroup.label}
                        </div>

                        <div className="space-y-3">
                          {monthGroup.dates.map((dateGroup) => (
                            <div key={dateGroup.dateStr} className="flex gap-4">
                              <div className="w-24 shrink-0 pt-3 text-right text-[12px] tabular-nums" style={{ color: 'var(--text-soft)' }}>
                                {formatDateShort(dateGroup.dateStr)}
                              </div>

                              <div className="relative min-w-0 flex-1 pl-5">
                                <div className="absolute bottom-0 left-0 top-0 w-px" style={{ background: 'var(--border-subtle)' }} />
                                <div
                                  className="absolute left-0 top-[14px] h-2.5 w-2.5 -translate-x-1/2 rounded-full"
                                  style={{
                                    background: dateGroup.events.some(isRelated) ? 'var(--accent-sky)' : 'rgba(56,189,248,0.35)',
                                    boxShadow: dateGroup.events.some(isRelated) ? '0 0 10px rgba(56,189,248,0.5)' : 'none',
                                  }}
                                />

                                <div className="space-y-2">
                                  {dateGroup.events.map((ev) => {
                                    const related = isRelated(ev);
                                    const clickable = !!ev.primaryNodeId && !!onSelectNode;
                                    return (
                                      <ThemedSection
                                        key={ev.id}
                                        className="px-4 py-3 transition-all"
                                        style={related ? {
                                          outline: '1px solid rgba(95,212,255,0.3)',
                                          background: 'rgba(95,212,255,0.04)',
                                        } : undefined}
                                      >
                                        <div className="flex flex-wrap items-center gap-2">
                                          <ThemedBadge tone={eventTone(ev.bucketCategory)}>
                                            {ev.bucketCategory}
                                          </ThemedBadge>
                                          <ThemedBadge tone="accent">
                                            {ev.sourceKind === 'relationship' ? 'Linked' : 'Record'}
                                          </ThemedBadge>
                                          {related && (
                                            <ThemedBadge tone="warning">Selected</ThemedBadge>
                                          )}
                                        </div>
                                        <div
                                          className={`mt-2 text-sm leading-6 ${clickable ? 'cursor-pointer hover:underline' : ''}`}
                                          style={{ color: 'var(--text-primary)' }}
                                          onClick={clickable ? () => onSelectNode!(ev.primaryNodeId!) : undefined}
                                        >
                                          {ev.text}
                                        </div>
                                        {ev.sourceKind === 'relationship' && ev.relatedNodeIds.length > 1 && onSelectNode && (
                                          <div className="mt-2 flex flex-wrap gap-2">
                                            {ev.relatedNodeIds.map((nid) => {
                                              const node = nodeById.get(nid);
                                              if (!node) return null;
                                              return (
                                                <button
                                                  key={nid}
                                                  onClick={() => onSelectNode(nid)}
                                                  className="rounded px-2 py-0.5 text-[11px] transition-opacity hover:opacity-70"
                                                  style={{
                                                    background: nid === selectedNodeId ? 'rgba(95,212,255,0.15)' : 'var(--surface-base)',
                                                    border: '1px solid var(--border-subtle)',
                                                    color: nid === selectedNodeId ? 'var(--accent-sky)' : 'var(--text-muted)',
                                                  }}
                                                >
                                                  {name(node)}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </ThemedSection>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
