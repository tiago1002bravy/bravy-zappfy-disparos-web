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
import { STATUS_DOT, STATUS_LABEL } from './event-colors';

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
                  <Users className="size-4 text-muted-foreground" />
                ) : (
                  <MessageSquare className="size-4 text-muted-foreground" />
                )}
                {event.title}
              </DialogTitle>
              <DialogDescription>
                {new Date(event.occurrenceAt).toLocaleString('pt-BR')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1.5 font-normal">
                  <span className={`size-2 rounded-full ${STATUS_DOT[event.status]}`} />
                  {STATUS_LABEL[event.status]}
                </Badge>
                <Badge variant="outline">{event.scheduleType}</Badge>
                <Badge variant="outline">{event.scheduleStatus}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Grupos</div>
                  <div className="text-base font-medium text-foreground">
                    {event.groupCount}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Tipo</div>
                  <div className="text-base font-medium text-foreground">
                    {event.kind === 'group-update' ? 'Atualizar grupo' : 'Mensagem'}
                  </div>
                </div>
              </div>

              {event.executionStats && (
                <div className="rounded border p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Execuções
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-lg font-semibold">{event.executionStats.total}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-brand">
                        {event.executionStats.success}
                      </div>
                      <div className="text-xs text-muted-foreground">Sucesso</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                        {event.executionStats.failed}
                      </div>
                      <div className="text-xs text-muted-foreground">Falhou</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                        {event.executionStats.skipped}
                      </div>
                      <div className="text-xs text-muted-foreground">Pulado</div>
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
