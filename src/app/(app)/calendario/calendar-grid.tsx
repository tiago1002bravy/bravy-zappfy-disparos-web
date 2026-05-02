'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, format, isSameDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, Users, Layers, ChevronRight } from 'lucide-react';
import type { CalendarEvent } from './page';
import { STATUS_BAR, STATUS_DOT, STATUS_LABEL } from './event-colors';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const HOUR_PX = 56;
const HALF_HOUR_PX = HOUR_PX / 2;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const EVENT_DURATION_MS = 30 * 60 * 1000;
const CLUSTER_THRESHOLD = 3; // 3+ eventos sobrepostos → vira card de resumo

type ClusterGroup = {
  events: CalendarEvent[];
  startMs: number;
  endMs: number;
};

type Positioned = CalendarEvent & { trackIdx: number; trackCount: number };

function groupClusters(events: CalendarEvent[]): ClusterGroup[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.occurrenceAt).getTime() - new Date(b.occurrenceAt).getTime(),
  );
  const groups: ClusterGroup[] = [];
  let current: ClusterGroup | null = null;
  for (const e of sorted) {
    const start = new Date(e.occurrenceAt).getTime();
    const end = start + EVENT_DURATION_MS;
    if (!current || start >= current.endMs) {
      current = { events: [e], startMs: start, endMs: end };
      groups.push(current);
    } else {
      current.events.push(e);
      if (end > current.endMs) current.endMs = end;
    }
  }
  return groups;
}

function layoutSparse(events: CalendarEvent[]): Positioned[] {
  // mesmo algoritmo de tracks, mas só pra eventos que não viraram cluster denso
  const sorted = [...events].sort(
    (a, b) => new Date(a.occurrenceAt).getTime() - new Date(b.occurrenceAt).getTime(),
  );
  const out: Positioned[] = [];
  let cluster: { event: CalendarEvent; start: number; end: number }[] = [];
  let clusterEnd = 0;
  const flush = () => {
    if (!cluster.length) return;
    const tracks: number[] = [];
    const placed: { event: CalendarEvent; trackIdx: number }[] = [];
    for (const item of cluster) {
      let idx = tracks.findIndex((endMs) => endMs <= item.start);
      if (idx === -1) {
        idx = tracks.length;
        tracks.push(0);
      }
      tracks[idx] = item.end;
      placed.push({ event: item.event, trackIdx: idx });
    }
    for (const p of placed) {
      out.push({ ...p.event, trackIdx: p.trackIdx, trackCount: tracks.length });
    }
  };
  for (const e of sorted) {
    const start = new Date(e.occurrenceAt).getTime();
    const end = start + EVENT_DURATION_MS;
    if (!cluster.length || start >= clusterEnd) {
      flush();
      cluster = [{ event: e, start, end }];
      clusterEnd = end;
    } else {
      cluster.push({ event: e, start, end });
      if (end > clusterEnd) clusterEnd = end;
    }
  }
  flush();
  return out;
}

function dominantStatus(events: CalendarEvent[]): CalendarEvent['status'] {
  const counts: Record<string, number> = {};
  for (const e of events) counts[e.status] = (counts[e.status] ?? 0) + 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (sorted[0]?.[0] ?? 'scheduled') as CalendarEvent['status'];
}

export function CalendarGrid({
  view,
  cursor,
  events,
  onEventClick,
}: {
  view: 'week' | 'day';
  cursor: Date;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
}) {
  const days =
    view === 'week'
      ? Array.from({ length: 7 }, (_, i) => addDays(startOfDay(cursor), i))
      : [startOfDay(cursor)];

  const eventsByDay = days.map((d) =>
    events.filter((e) => isSameDay(new Date(e.occurrenceAt), d)),
  );

  const totalHeight = HOUR_PX * 24;
  const cols = view === 'week' ? 7 : 1;

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = HOUR_PX * 7;
  }, []);

  const [clusterModal, setClusterModal] = useState<ClusterGroup | null>(null);

  return (
    <div className="flex flex-col h-full rounded-md border bg-card overflow-hidden">
      <div
        className="grid border-b bg-card shrink-0"
        style={{ gridTemplateColumns: `60px repeat(${cols}, 1fr)` }}
      >
        <div />
        {days.map((d) => {
          const today = isSameDay(d, new Date());
          return (
            <div
              key={d.toISOString()}
              className="px-3 py-2 border-l border-border"
            >
              <div
                className={`text-xs ${
                  today ? 'text-brand font-semibold' : 'text-muted-foreground'
                }`}
              >
                {format(d, 'EEEE', { locale: ptBR })}
              </div>
              <div
                className={`text-sm ${
                  today ? 'text-brand font-semibold' : 'text-muted-foreground'
                }`}
              >
                {format(d, "d 'de' MMM", { locale: ptBR })}
              </div>
            </div>
          );
        })}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        <div
          className="grid relative"
          style={{ gridTemplateColumns: `60px repeat(${cols}, 1fr)`, height: totalHeight }}
        >
          <div className="relative">
            {HOURS.map((h) => (
              <div
                key={h}
                className="relative"
                style={{ height: HOUR_PX }}
              >
                <div
                  className="absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground leading-none tabular-nums"
                  style={{ top: 0 }}
                >
                  {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
                </div>
              </div>
            ))}
          </div>

          {days.map((d, dayIdx) => (
            <DayColumn
              key={d.toISOString()}
              day={d}
              events={eventsByDay[dayIdx]}
              onEventClick={onEventClick}
              onClusterClick={setClusterModal}
            />
          ))}
        </div>
      </div>

      <ClusterDialog
        cluster={clusterModal}
        onOpenChange={(o) => !o && setClusterModal(null)}
        onPickEvent={(e) => {
          setClusterModal(null);
          onEventClick(e);
        }}
      />
    </div>
  );
}

function DayColumn({
  day,
  events,
  onEventClick,
  onClusterClick,
}: {
  day: Date;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
  onClusterClick: (cluster: ClusterGroup) => void;
}) {
  const isToday = isSameDay(day, new Date());
  const nowMinutes = isToday
    ? new Date().getHours() * 60 + new Date().getMinutes()
    : -1;

  const { sparseEvents, denseClusters } = useMemo(() => {
    const groups = groupClusters(events);
    const sparseEvents: CalendarEvent[] = [];
    const denseClusters: ClusterGroup[] = [];
    for (const g of groups) {
      if (g.events.length >= CLUSTER_THRESHOLD) denseClusters.push(g);
      else sparseEvents.push(...g.events);
    }
    return { sparseEvents, denseClusters };
  }, [events]);

  return (
    <div className="relative border-l border-border">
      {HOURS.map((h) => (
        <div
          key={h}
          className="border-b border-border/50"
          style={{ height: HOUR_PX }}
        />
      ))}

      {nowMinutes >= 0 && (
        <div
          className="absolute left-0 right-0 z-10 pointer-events-none"
          style={{ top: nowMinutes * (HOUR_PX / 60) }}
        >
          <div className="h-px bg-red-500" />
          <div className="absolute -left-1 -top-1 size-2 rounded-full bg-red-500" />
        </div>
      )}

      {/* Eventos esparsos: render normal com tracks */}
      {layoutSparse(sparseEvents).map((e) => {
        const dt = new Date(e.occurrenceAt);
        const minutes = dt.getHours() * 60 + dt.getMinutes();
        const top = minutes * (HOUR_PX / 60);
        const widthPct = 100 / e.trackCount;
        const leftPct = e.trackIdx * widthPct;
        const showTime = e.trackCount === 1;
        return (
          <button
            key={e.id}
            type="button"
            onClick={() => onEventClick(e)}
            className="absolute flex items-center gap-1.5 pr-1.5 overflow-hidden rounded-md bg-muted hover:bg-accent hover:z-20 hover:shadow-md hover:ring-2 hover:ring-brand/30 text-left text-xs text-foreground transition-all"
            style={{
              top,
              height: HALF_HOUR_PX - 2,
              left: `calc(${leftPct}% + 2px)`,
              width: `calc(${widthPct}% - 4px)`,
            }}
            title={`${format(dt, 'HH:mm')} · ${e.title} (${e.groupCount} grupo${e.groupCount === 1 ? '' : 's'})`}
          >
            <div className={`h-full w-1 shrink-0 ${STATUS_BAR[e.status]}`} />
            {e.kind === 'group-update' ? (
              <Users className="size-3 shrink-0 text-muted-foreground" />
            ) : (
              <MessageSquare className="size-3 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate font-medium leading-tight flex-1 min-w-0">
              {e.title}
            </span>
            {showTime && (
              <span className="text-[10px] tabular-nums text-muted-foreground leading-tight shrink-0">
                {format(dt, 'HH:mm')}
              </span>
            )}
          </button>
        );
      })}

      {/* Clusters densos: 1 card de resumo */}
      {denseClusters.map((c) => {
        const startDt = new Date(c.startMs);
        const endDt = new Date(c.endMs);
        const startMin = startDt.getHours() * 60 + startDt.getMinutes();
        const endMin = endDt.getHours() * 60 + endDt.getMinutes();
        const top = startMin * (HOUR_PX / 60);
        const height = Math.max((endMin - startMin) * (HOUR_PX / 60) - 4, HALF_HOUR_PX - 2);
        const status = dominantStatus(c.events);
        const statusCounts = c.events.reduce<Record<string, number>>((acc, e) => {
          acc[e.status] = (acc[e.status] ?? 0) + 1;
          return acc;
        }, {});
        const compact = height < 56;
        return (
          <button
            key={`cluster-${c.startMs}`}
            type="button"
            onClick={() => onClusterClick(c)}
            className="absolute group flex overflow-hidden rounded-lg border border-border bg-card hover:bg-muted hover:z-20 hover:shadow-lg hover:border-brand/40 text-left text-foreground transition-all"
            style={{
              top: top + 2,
              height,
              left: 4,
              right: 4,
            }}
            title={`${c.events.length} disparos entre ${format(startDt, 'HH:mm')} e ${format(endDt, 'HH:mm')}`}
          >
            {/* Barra de status à esquerda */}
            <div className={`w-1 shrink-0 ${STATUS_BAR[status]}`} />

            {compact ? (
              // Layout compacto: tudo numa linha só, sem pills (só dot+número)
              <div className="flex-1 min-w-0 px-3 flex items-center gap-3 text-xs">
                <span className="font-bold tabular-nums shrink-0">{c.events.length}</span>
                <span className="text-muted-foreground shrink-0">disparos</span>
                <div className="flex items-center gap-2 ml-auto shrink-0">
                  {Object.entries(statusCounts).map(([s, n]) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 text-[11px] tabular-nums"
                    >
                      <span className={`size-2 rounded-full ${STATUS_DOT[s as CalendarEvent['status']]}`} />
                      <span className="font-semibold">{n}</span>
                    </span>
                  ))}
                </div>
                <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            ) : (
              // Layout expandido: número grande + divider + pills
              <div className="flex-1 min-w-0 px-3 py-2 flex items-center gap-3">
                <div className="flex items-baseline gap-1.5 shrink-0">
                  <span className="text-2xl font-bold tabular-nums leading-none">{c.events.length}</span>
                  <span className="text-xs text-muted-foreground leading-none">disparos</span>
                </div>
                <div className="h-8 w-px bg-border shrink-0" />
                <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                  {Object.entries(statusCounts).map(([s, n]) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 text-[10px] tabular-nums px-1.5 py-0.5 rounded bg-muted"
                    >
                      <span className={`size-1.5 rounded-full ${STATUS_DOT[s as CalendarEvent['status']]}`} />
                      <span className="font-semibold">{n}</span>
                    </span>
                  ))}
                </div>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ClusterDialog({
  cluster,
  onOpenChange,
  onPickEvent,
}: {
  cluster: ClusterGroup | null;
  onOpenChange: (o: boolean) => void;
  onPickEvent: (e: CalendarEvent) => void;
}) {
  if (!cluster) {
    return <Dialog open={false} onOpenChange={onOpenChange}><DialogContent className="hidden" /></Dialog>;
  }
  const startDt = new Date(cluster.startMs);
  const endDt = new Date(cluster.endMs);
  const sorted = [...cluster.events].sort(
    (a, b) => new Date(a.occurrenceAt).getTime() - new Date(b.occurrenceAt).getTime(),
  );
  const statusCounts = cluster.events.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg flex items-center gap-2">
            <Layers className="size-5 text-muted-foreground" />
            {cluster.events.length} disparos
            <span className="text-sm font-normal text-muted-foreground tabular-nums ml-2">
              {format(startDt, 'HH:mm')}–{format(endDt, 'HH:mm')}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 py-3 border-b bg-muted/50 flex items-center gap-4 flex-wrap">
          {Object.entries(statusCounts).map(([s, n]) => (
            <div key={s} className="flex items-center gap-1.5 text-xs text-foreground tabular-nums">
              <span className={`size-2.5 rounded-full ${STATUS_DOT[s as CalendarEvent['status']]}`} />
              <span className="font-medium">{n}</span>
              <span className="text-muted-foreground">{STATUS_LABEL[s as CalendarEvent['status']]}</span>
            </div>
          ))}
        </div>
        <div className="max-h-[60vh] overflow-y-auto divide-y">
          {sorted.map((e) => {
            const dt = new Date(e.occurrenceAt);
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => onPickEvent(e)}
                className="w-full flex items-center gap-3 px-6 py-3 hover:bg-muted text-left transition-colors"
              >
                <div className={`size-2.5 rounded-full shrink-0 ${STATUS_DOT[e.status]}`} />
                <span className="text-xs font-mono tabular-nums text-muted-foreground w-12 shrink-0">
                  {format(dt, 'HH:mm')}
                </span>
                {e.kind === 'group-update' ? (
                  <Users className="size-4 text-muted-foreground shrink-0" />
                ) : (
                  <MessageSquare className="size-4 text-muted-foreground shrink-0" />
                )}
                <span className="text-sm font-medium truncate flex-1">{e.title}</span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {e.groupCount} grupo{e.groupCount === 1 ? '' : 's'}
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
