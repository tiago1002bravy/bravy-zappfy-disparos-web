'use client';
import { useEffect, useMemo, useRef } from 'react';
import { addDays, format, isSameDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, Users } from 'lucide-react';
import type { CalendarEvent } from './page';
import type { CalendarEventStatus } from './event-colors';
import { STATUS_BG } from './event-colors';

const HOUR_PX = 64;
const HALF_HOUR_PX = HOUR_PX / 2;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const EVENT_DURATION_MS = 30 * 60 * 1000;
const MAX_TRACKS = 3;

const STATUS_PRIORITY: Record<CalendarEventStatus, number> = {
  failed: 5,
  partial: 4,
  scheduled: 3,
  skipped: 2,
  success: 1,
};

type EventGroup = {
  id: string;
  occurrenceAt: string;
  events: CalendarEvent[];
  status: CalendarEventStatus;
  kindMix: 'message' | 'group-update' | 'mixed';
  totalGroups: number;
};

type Positioned = EventGroup & { trackIdx: number; trackCount: number };

function groupByMinute(events: CalendarEvent[]): EventGroup[] {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const dt = new Date(e.occurrenceAt);
    const key = `${dt.getHours()}:${dt.getMinutes()}`;
    let arr = map.get(key);
    if (!arr) {
      arr = [];
      map.set(key, arr);
    }
    arr.push(e);
  }
  const groups: EventGroup[] = [];
  for (const [, evs] of map) {
    const dt = new Date(evs[0].occurrenceAt);
    let topStatus: CalendarEventStatus = evs[0].status;
    for (const e of evs) {
      if (STATUS_PRIORITY[e.status] > STATUS_PRIORITY[topStatus]) topStatus = e.status;
    }
    let kindMix: EventGroup['kindMix'] = evs[0].kind;
    if (evs.some((e) => e.kind !== evs[0].kind)) kindMix = 'mixed';
    groups.push({
      id: `grp-${dt.toISOString()}-${evs.map((e) => e.id).join('|').slice(0, 80)}`,
      occurrenceAt: dt.toISOString(),
      events: evs,
      status: topStatus,
      kindMix,
      totalGroups: evs.reduce((acc, e) => acc + e.groupCount, 0),
    });
  }
  groups.sort((a, b) => a.occurrenceAt.localeCompare(b.occurrenceAt));
  return groups;
}

function mergeGroups(groups: EventGroup[]): EventGroup {
  const allEvents = groups.flatMap((g) => g.events);
  const dt = new Date(groups[0].occurrenceAt);
  let topStatus: CalendarEventStatus = allEvents[0].status;
  for (const e of allEvents) {
    if (STATUS_PRIORITY[e.status] > STATUS_PRIORITY[topStatus]) topStatus = e.status;
  }
  let kindMix: EventGroup['kindMix'] = allEvents[0].kind;
  if (allEvents.some((e) => e.kind !== allEvents[0].kind)) kindMix = 'mixed';
  return {
    id: `superstack-${dt.toISOString()}`,
    occurrenceAt: dt.toISOString(),
    events: allEvents,
    status: topStatus,
    kindMix,
    totalGroups: allEvents.reduce((acc, e) => acc + e.groupCount, 0),
  };
}

function layoutGroups(groups: EventGroup[]): Positioned[] {
  const out: Positioned[] = [];
  let cluster: { group: EventGroup; start: number; end: number }[] = [];
  let clusterEnd = 0;
  const flush = () => {
    if (!cluster.length) return;
    const tracks: number[] = [];
    const placed: { group: EventGroup; trackIdx: number }[] = [];
    for (const item of cluster) {
      let idx = tracks.findIndex((endMs) => endMs <= item.start);
      if (idx === -1) {
        idx = tracks.length;
        tracks.push(0);
      }
      tracks[idx] = item.end;
      placed.push({ group: item.group, trackIdx: idx });
    }
    if (tracks.length > MAX_TRACKS) {
      const merged = mergeGroups(cluster.map((c) => c.group));
      out.push({ ...merged, trackIdx: 0, trackCount: 1 });
      return;
    }
    const trackCount = tracks.length;
    for (const p of placed) {
      out.push({ ...p.group, trackIdx: p.trackIdx, trackCount });
    }
  };
  for (const g of groups) {
    const start = new Date(g.occurrenceAt).getTime();
    const end = start + EVENT_DURATION_MS;
    if (!cluster.length || start >= clusterEnd) {
      flush();
      cluster = [{ group: g, start, end }];
      clusterEnd = end;
    } else {
      cluster.push({ group: g, start, end });
      if (end > clusterEnd) clusterEnd = end;
    }
  }
  flush();
  return out;
}

export function CalendarGrid({
  view,
  cursor,
  events,
  onEventClick,
  onGroupClick,
}: {
  view: 'week' | 'day';
  cursor: Date;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
  onGroupClick: (events: CalendarEvent[]) => void;
}) {
  const days =
    view === 'week'
      ? Array.from({ length: 7 }, (_, i) => addDays(startOfDay(cursor), i))
      : [startOfDay(cursor)];

  const totalHeight = HOUR_PX * 24;
  const cols = view === 'week' ? 7 : 1;

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = HOUR_PX * 7;
  }, []);

  return (
    <div className="flex flex-col h-full rounded-md border bg-white dark:bg-zinc-950 overflow-hidden">
      <div
        className="grid border-b bg-zinc-50 dark:bg-zinc-900 shrink-0"
        style={{ gridTemplateColumns: `60px repeat(${cols}, 1fr)` }}
      >
        <div />
        {days.map((d) => (
          <div
            key={d.toISOString()}
            className={`px-2 py-3 text-center border-l ${
              isSameDay(d, new Date()) ? 'bg-blue-50 dark:bg-blue-950/30' : ''
            }`}
          >
            <div className="text-xs uppercase text-zinc-500">
              {format(d, 'EEE', { locale: ptBR })}
            </div>
            <div className="text-lg font-semibold">{format(d, 'd')}</div>
          </div>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        <div
          className="grid relative"
          style={{ gridTemplateColumns: `60px repeat(${cols}, 1fr)`, height: totalHeight }}
        >
          <div className="border-r relative">
            {HOURS.map((h) => (
              <div key={h} className="relative" style={{ height: HOUR_PX }}>
                <div
                  className="absolute right-2 -translate-y-1/2 text-[10px] text-zinc-400 leading-none"
                  style={{ top: 0 }}
                >
                  {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
                </div>
                <div
                  className="absolute right-2 text-[9px] text-zinc-300 dark:text-zinc-600 leading-none"
                  style={{ top: HALF_HOUR_PX, transform: 'translateY(-50%)' }}
                >
                  {String(h).padStart(2, '0')}:30
                </div>
              </div>
            ))}
          </div>

          {days.map((d) => (
            <DayColumn
              key={d.toISOString()}
              day={d}
              events={events}
              onEventClick={onEventClick}
              onGroupClick={onGroupClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayColumn({
  day,
  events,
  onEventClick,
  onGroupClick,
}: {
  day: Date;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
  onGroupClick: (events: CalendarEvent[]) => void;
}) {
  const isToday = isSameDay(day, new Date());
  const nowMinutes = isToday ? new Date().getHours() * 60 + new Date().getMinutes() : -1;

  const groups = useMemo(() => {
    const ofDay = events.filter((e) => isSameDay(new Date(e.occurrenceAt), day));
    return layoutGroups(groupByMinute(ofDay));
  }, [events, day]);

  return (
    <div className={`relative border-l ${isToday ? 'bg-blue-50/30 dark:bg-blue-950/10' : ''}`}>
      {HOURS.map((h) => (
        <div
          key={h}
          className="border-b border-zinc-200 dark:border-zinc-800 relative"
          style={{ height: HOUR_PX }}
        >
          <div
            className="absolute left-0 right-0 border-t border-dashed border-zinc-100 dark:border-zinc-900"
            style={{ top: HALF_HOUR_PX }}
          />
        </div>
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

      {groups.map((g) => {
        const dt = new Date(g.occurrenceAt);
        const minutes = dt.getHours() * 60 + dt.getMinutes();
        const top = minutes * (HOUR_PX / 60);
        const widthPct = 100 / g.trackCount;
        const leftPct = g.trackIdx * widthPct;
        const isStack = g.events.length > 1;
        const compact = g.trackCount > 1;
        const Icon = g.kindMix === 'group-update' ? Users : MessageSquare;
        const onClick = () => {
          if (isStack) onGroupClick(g.events);
          else onEventClick(g.events[0]);
        };
        return (
          <button
            key={g.id}
            type="button"
            onClick={onClick}
            className={`absolute rounded px-1.5 py-0.5 text-left text-white text-xs shadow-sm border transition-colors overflow-hidden ${
              STATUS_BG[g.status]
            }`}
            style={{
              top,
              height: HALF_HOUR_PX - 2,
              left: `calc(${leftPct}% + 2px)`,
              width: `calc(${widthPct}% - 4px)`,
            }}
            title={
              isStack
                ? `${format(dt, 'HH:mm')} — ${g.events.length} disparos (${g.totalGroups} grupos)`
                : `${format(dt, 'HH:mm')} ${g.events[0].title} (${g.totalGroups} grupos)`
            }
          >
            <div className="flex items-center gap-1 leading-tight">
              <Icon className="size-3 shrink-0" />
              <span className="font-medium tabular-nums">{format(dt, 'HH:mm')}</span>
              {isStack && (
                <span className="bg-white/25 rounded px-1 text-[10px] font-semibold tabular-nums">
                  ×{g.events.length}
                </span>
              )}
              {!compact && !isStack && <span className="truncate">{g.events[0].title}</span>}
            </div>
            {!compact && !isStack && g.events[0].groupCount > 0 && (
              <div className="text-[10px] opacity-80 leading-tight">
                {g.events[0].groupCount} grupo{g.events[0].groupCount === 1 ? '' : 's'}
              </div>
            )}
            {!compact && isStack && (
              <div className="text-[10px] opacity-80 leading-tight truncate">
                {g.totalGroups} grupos no total
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
