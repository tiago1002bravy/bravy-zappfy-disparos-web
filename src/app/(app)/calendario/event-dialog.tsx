'use client';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, MessageSquare, Users } from 'lucide-react';
import type { CalendarEvent } from './page';
import { STATUS_BG, STATUS_LABEL } from './event-colors';

export function EventDialog({
  event,
  onOpenChange,
}: {
  event: CalendarEvent | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!event} onOpenChange={onOpenChange}>
      <DialogContent>
        {event && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {event.kind === 'group-update' ? (
                  <Users className="size-4 text-zinc-500" />
                ) : (
                  <MessageSquare className="size-4 text-zinc-500" />
                )}
                {event.title}
              </DialogTitle>
              <DialogDescription>
                {new Date(event.occurrenceAt).toLocaleString('pt-BR')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge className={`${STATUS_BG[event.status]} text-white border-0`}>
                  {STATUS_LABEL[event.status]}
                </Badge>
                <Badge variant="outline">{event.scheduleType}</Badge>
                <Badge variant="outline">{event.scheduleStatus}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-400">
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-400">Grupos</div>
                  <div className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                    {event.groupCount}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-400">Tipo</div>
                  <div className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                    {event.kind === 'group-update' ? 'Atualizar grupo' : 'Mensagem'}
                  </div>
                </div>
              </div>

              {event.executionStats && (
                <div className="rounded border p-3">
                  <div className="text-xs uppercase tracking-wide text-zinc-400 mb-2">
                    Execuções
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-lg font-semibold">{event.executionStats.total}</div>
                      <div className="text-xs text-zinc-500">Total</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-emerald-600">
                        {event.executionStats.success}
                      </div>
                      <div className="text-xs text-zinc-500">Sucesso</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-red-600">
                        {event.executionStats.failed}
                      </div>
                      <div className="text-xs text-zinc-500">Falhou</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-amber-600">
                        {event.executionStats.skipped}
                      </div>
                      <div className="text-xs text-zinc-500">Pulado</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              {event.kind === 'message' ? (
                <Link href={`/agendamentos/${event.scheduleId}`}>
                  <Button variant="outline">
                    <ExternalLink className="size-4 mr-2" />
                    Abrir agendamento
                  </Button>
                </Link>
              ) : (
                <Link href={`/group-updates`}>
                  <Button variant="outline">
                    <ExternalLink className="size-4 mr-2" />
                    Abrir atualização
                  </Button>
                </Link>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
