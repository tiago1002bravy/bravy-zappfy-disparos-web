'use client';
import { useEffect, useRef } from 'react';
import { addDays, format, isSameDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, Users } from 'lucide-react';
import type { CalendarEvent } from './page';
import { STATUS_BAR } from './event-colors';

const HOUR_PX = 56;
const HALF_HOUR_PX = HOUR_PX / 2;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const EVENT_DURATION_MS = 30 * 60 * 1000;

type Positioned = CalendarEvent & { trackIdx: number; trackCount: number };

function layoutEvents(events: CalendarEvent[]): Positioned[] {
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

  return (
    <div className="flex flex-col h-full rounded-md border bg-white dark:bg-zinc-950 overflow-hidden">
      <div
        className="grid border-b bg-white dark:bg-zinc-950 shrink-0"
        style={{ gridTemplateColumns: `60px repeat(${cols}, 1fr)` }}
      >
        <div />
        {days.map((d) => {
          const today = isSameDay(d, new Date());
          return (
            <div
              key={d.toISOString()}
              className="px-3 py-2 border-l border-zinc-200 dark:border-zinc-800"
            >
              <div
                className={`text-xs ${
                  today ? 'text-violet-600 font-semibold' : 'text-zinc-500'
                }`}
              >
                {format(d, 'EEEE', { locale: ptBR })}
              </div>
              <div
                className={`text-sm ${
                  today ? 'text-violet-600 font-semibold' : 'text-zinc-500'
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
                  className="absolute right-2 -translate-y-1/2 text-[11px] text-zinc-500 leading-none tabular-nums"
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
}: {
  day: Date;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
}) {
  const isToday = isSameDay(day, new Date());
  const nowMinutes = isToday
    ? new Date().getHours() * 60 + new Date().getMinutes()
    : -1;

  return (
    <div className="relative border-l border-zinc-200 dark:border-zinc-800">
      {HOURS.map((h) => (
        <div
          key={h}
          className="border-b border-zinc-100 dark:border-zinc-900"
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

      {layoutEvents(events).map((e) => {
        const dt = new Date(e.occurrenceAt);
        const minutes = dt.getHours() * 60 + dt.getMinutes();
        const top = minutes * (HOUR_PX / 60);
        const widthPct = 100 / e.trackCount;
        const leftPct = e.trackIdx * widthPct;
        const compact = e.trackCount > 2;
        return (
          <button
            key={e.id}
            type="button"
            onClick={() => onEventClick(e)}
            className="absolute group flex items-center gap-1.5 overflow-hidden rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 text-left text-xs text-zinc-800 dark:text-zinc-100 transition-colors pr-2"
            style={{
              top,
              height: HALF_HOUR_PX - 2,
              left: `calc(${leftPct}% + 2px)`,
              width: `calc(${widthPct}% - 4px)`,
            }}
            title={`${format(dt, 'HH:mm')} ${e.title} (${e.groupCount} grupos)`}
          >
            <div className={`h-full w-1 shrink-0 ${STATUS_BAR[e.status]}`} />
            {e.kind === 'group-update' ? (
              <Users className="size-3 shrink-0 text-zinc-500" />
            ) : (
              <MessageSquare className="size-3 shrink-0 text-zinc-500" />
            )}
            <span className="truncate font-medium leading-tight flex-1 min-w-0">
              {e.title}
            </span>
            {!compact && (
              <span className="text-[10px] tabular-nums text-zinc-500 leading-tight shrink-0">
                {format(dt, 'HH:mm')}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
