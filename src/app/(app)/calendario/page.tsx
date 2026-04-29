'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addDays, endOfDay, endOfWeek, format, startOfDay, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CalendarGrid } from './calendar-grid';
import { EventDialog } from './event-dialog';
import { STATUS_DOT, STATUS_LABEL, type CalendarEventStatus } from './event-colors';

export interface CalendarEvent {
  id: string;
  kind: 'message' | 'group-update';
  scheduleId: string;
  occurrenceAt: string;
  title: string;
  status: CalendarEventStatus;
  groupCount: number;
  scheduleType: 'ONCE' | 'DAILY' | 'WEEKLY' | 'CUSTOM_CRON';
  scheduleStatus: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELED';
  isPast: boolean;
  executionStats?: { success: number; failed: number; skipped: number; total: number };
}

type View = 'week' | 'day';

const STATUSES: CalendarEventStatus[] = ['scheduled', 'success', 'partial', 'failed', 'skipped'];

export default function CalendarioPage() {
  const [view, setView] = useState<View>('week');
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [includeGroupUpdates, setIncludeGroupUpdates] = useState(true);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  const { from, to } = rangeFor(view, cursor);

  const { data = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['calendar', from.toISOString(), to.toISOString(), includeGroupUpdates ? 'all' : 'message'],
    queryFn: async () => {
      const r = await api.get('/calendar/events', {
        params: {
          from: from.toISOString(),
          to: to.toISOString(),
          kind: includeGroupUpdates ? 'all' : 'message',
        },
      });
      return r.data;
    },
    refetchInterval: 30_000,
  });

  function shift(direction: -1 | 1) {
    setCursor((d) => (view === 'week' ? addDays(d, 7 * direction) : addDays(d, direction)));
  }

  function gotoToday() {
    setCursor(new Date());
  }

  return (
    <div className="flex flex-col h-full -ml-2 -mr-6 -my-6 p-3 gap-4">
      <div className="flex items-center justify-between flex-wrap gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold">Calendário</h1>
          <p className="text-sm text-zinc-500">
            Visão temporal de disparos, agendamentos e atualizações de grupo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => shift(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={gotoToday}>
            Hoje
          </Button>
          <Button variant="outline" size="sm" onClick={() => shift(1)}>
            <ChevronRight className="size-4" />
          </Button>
          <div className="ml-2 flex items-center rounded-md border overflow-hidden">
            <button
              type="button"
              onClick={() => setView('week')}
              className={`px-3 py-1.5 text-sm ${
                view === 'week' ? 'bg-zinc-200 dark:bg-zinc-800' : ''
              }`}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => setView('day')}
              className={`px-3 py-1.5 text-sm border-l ${
                view === 'day' ? 'bg-zinc-200 dark:bg-zinc-800' : ''
              }`}
            >
              Dia
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4 shrink-0">
        <div className="text-lg font-medium">{rangeLabel(view, cursor)}</div>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Switch
              id="group-updates"
              checked={includeGroupUpdates}
              onCheckedChange={setIncludeGroupUpdates}
            />
            <Label htmlFor="group-updates" className="text-sm">
              Atualizações de grupo
            </Label>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {STATUSES.map((s) => (
              <div key={s} className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                <span className={`size-2.5 rounded-full ${STATUS_DOT[s]}`} />
                {STATUS_LABEL[s]}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="text-sm text-zinc-500">Carregando…</div>
        ) : (
          <CalendarGrid view={view} cursor={cursor} events={data} onEventClick={setSelected} />
        )}
      </div>

      <EventDialog event={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}

function rangeFor(view: View, cursor: Date) {
  if (view === 'day') {
    return { from: startOfDay(cursor), to: endOfDay(cursor) };
  }
  // semana começa segunda-feira
  return {
    from: startOfWeek(cursor, { weekStartsOn: 1 }),
    to: endOfWeek(cursor, { weekStartsOn: 1 }),
  };
}

function rangeLabel(view: View, cursor: Date) {
  if (view === 'day') {
    return format(cursor, "EEEE, d 'de' MMMM yyyy", { locale: ptBR });
  }
  const start = startOfWeek(cursor, { weekStartsOn: 1 });
  const end = endOfWeek(cursor, { weekStartsOn: 1 });
  return `${format(start, 'd MMM', { locale: ptBR })} – ${format(end, "d MMM yyyy", {
    locale: ptBR,
  })}`;
}

