'use client';
import { addDays, format, isSameDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, Users } from 'lucide-react';
import type { CalendarEvent } from './page';
import { STATUS_BG } from './event-colors';

const HOUR_PX = 48;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

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

  return (
    <div className="rounded-md border bg-white dark:bg-zinc-950 overflow-hidden">
      <div
        className="grid border-b bg-zinc-50 dark:bg-zinc-900"
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

      <div
        className="grid relative"
        style={{ gridTemplateColumns: `60px repeat(${cols}, 1fr)`, height: totalHeight }}
      >
        <div className="border-r">
          {HOURS.map((h) => (
            <div
              key={h}
              className="text-[10px] text-zinc-400 text-right pr-2 -translate-y-1/2"
              style={{ height: HOUR_PX, lineHeight: `${HOUR_PX}px` }}
            >
              {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
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
    <div
      className={`relative border-l ${
        isToday ? 'bg-blue-50/30 dark:bg-blue-950/10' : ''
      }`}
    >
      {HOURS.map((h) => (
        <div
          key={h}
          className="border-b border-zinc-100 dark:border-zinc-800"
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

      {events.map((e) => {
        const dt = new Date(e.occurrenceAt);
        const minutes = dt.getHours() * 60 + dt.getMinutes();
        const top = minutes * (HOUR_PX / 60);
        return (
          <button
            key={e.id}
            type="button"
            onClick={() => onEventClick(e)}
            className={`absolute left-1 right-1 rounded px-2 py-1 text-left text-white text-xs shadow-sm border transition-colors ${
              STATUS_BG[e.status]
            }`}
            style={{ top, minHeight: 28 }}
          >
            <div className="flex items-center gap-1">
              {e.kind === 'group-update' ? (
                <Users className="size-3 shrink-0" />
              ) : (
                <MessageSquare className="size-3 shrink-0" />
              )}
              <span className="font-medium tabular-nums">{format(dt, 'HH:mm')}</span>
              <span className="truncate">{e.title}</span>
            </div>
            {e.groupCount > 0 && (
              <div className="text-[10px] opacity-80">
                {e.groupCount} grupo{e.groupCount === 1 ? '' : 's'}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
