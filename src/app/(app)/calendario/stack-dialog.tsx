'use client';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, MessageSquare, Users } from 'lucide-react';
import type { CalendarEvent } from './page';
import { STATUS_DOT, STATUS_LABEL } from './event-colors';

export function StackDialog({
  events,
  onOpenChange,
}: {
  events: CalendarEvent[] | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!events} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {events && events.length > 0 && (
          <>
            <DialogHeader>
              <DialogTitle>
                {events.length} disparos às {format(new Date(events[0].occurrenceAt), 'HH:mm')}
              </DialogTitle>
              <DialogDescription>
                {format(new Date(events[0].occurrenceAt), "EEEE, d 'de' MMMM yyyy", {
                  locale: ptBR,
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
              <ul className="divide-y">
                {events.map((e) => {
                  const Icon = e.kind === 'group-update' ? Users : MessageSquare;
                  const href =
                    e.kind === 'message' ? `/agendamentos/${e.scheduleId}` : `/group-updates`;
                  return (
                    <li key={e.id} className="py-2.5">
                      <Link
                        href={href}
                        className="flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded px-2 py-1 -mx-2"
                      >
                        <span className={`size-2.5 rounded-full ${STATUS_DOT[e.status]}`} />
                        <Icon className="size-4 text-zinc-500" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{e.title}</div>
                          <div className="text-xs text-zinc-500 flex items-center gap-2">
                            <span>{e.groupCount} grupos</span>
                            <Badge variant="outline" className="text-[10px]">
                              {STATUS_LABEL[e.status]}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {e.scheduleType}
                            </Badge>
                          </div>
                        </div>
                        <ExternalLink className="size-4 text-zinc-400" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
