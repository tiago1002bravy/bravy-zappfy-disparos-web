'use client';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowUpRight, Pause, Play, Plus, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface CampaignListItem {
  id: string;
  name: string;
  audienceKind: 'LEAD' | 'BUYER' | 'ALL';
  status: 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELED';
  startAt: string;
  totalTargets: number;
  throttlePerMinute: number;
  template: { name: string } | null;
  messageStats: {
    total: number;
    pending: number;
    queued: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    skipped: number;
  };
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: 'Agendada', className: 'border-sky-300 text-sky-700 dark:border-sky-800 dark:text-sky-400' },
  RUNNING: { label: 'Rodando', className: 'border-brand/40 text-brand' },
  PAUSED: { label: 'Pausada', className: 'border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400' },
  COMPLETED: { label: 'Concluída', className: 'border-border text-muted-foreground' },
  CANCELED: { label: 'Cancelada', className: 'border-border text-muted-foreground line-through' },
};

const AUDIENCE_LABEL: Record<string, string> = { LEAD: 'Leads', BUYER: 'Compradores', ALL: 'Todos' };

export default function DisparosContatosPage() {
  const qc = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery<CampaignListItem[]>({
    queryKey: ['campaigns'],
    queryFn: async () => (await api.get('/campaigns')).data,
    refetchInterval: 5000,
  });

  const applyAction = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'pause' | 'resume' | 'cancel' }) =>
      api.patch(`/campaigns/${id}`, { action }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
    onError: (err: unknown) => {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(typeof m === 'string' ? m : 'Falha ao aplicar ação');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Disparos 1:1</h1>
          <p className="text-sm text-muted-foreground">
            Campanhas via WhatsApp Cloud API oficial (template aprovado, múltiplos números).
          </p>
        </div>
        <Link href="/disparos-contatos/novo">
          <Button size="sm">
            <Plus className="mr-1.5 size-4" />
            Nova campanha
          </Button>
        </Link>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Nome</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Audiência</TableHead>
              <TableHead>Início</TableHead>
              <TableHead className="min-w-44">Progresso</TableHead>
              <TableHead className="text-center">Falhas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && campaigns.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Nenhuma campanha ainda. Crie a primeira.
                </TableCell>
              </TableRow>
            )}
            {campaigns.map((c) => {
              const meta = STATUS_META[c.status] ?? STATUS_META.COMPLETED;
              const st = c.messageStats;
              const total = Math.max(c.totalTargets, st.total);
              const processed = st.sent + st.delivered + st.read + st.failed;
              const pctValue = total > 0 ? (processed / total) * 100 : 0;
              return (
                <TableRow key={c.id}>
                  <TableCell className="max-w-52 truncate font-medium" title={c.name}>
                    <Link href={`/disparos-contatos/${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-40 truncate font-mono text-xs text-muted-foreground">
                    {c.template?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-xs">{AUDIENCE_LABEL[c.audienceKind]}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                    {format(new Date(c.startAt), 'dd/MM HH:mm')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(pctValue, 100)} className="w-24" />
                      <span className="whitespace-nowrap text-[11px] tabular-nums text-muted-foreground">
                        {processed.toLocaleString('pt-BR')}/{total.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={cn(
                        'text-xs tabular-nums',
                        st.failed > 0 ? 'font-medium text-red-700 dark:text-red-400' : 'text-muted-foreground',
                      )}
                    >
                      {st.failed}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium',
                        meta.className,
                      )}
                    >
                      {meta.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {(c.status === 'RUNNING' || c.status === 'SCHEDULED') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          title="Pausar"
                          onClick={() => applyAction.mutate({ id: c.id, action: 'pause' })}
                        >
                          <Pause className="size-4" />
                        </Button>
                      )}
                      {c.status === 'PAUSED' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          title="Retomar"
                          onClick={() => applyAction.mutate({ id: c.id, action: 'resume' })}
                        >
                          <Play className="size-4" />
                        </Button>
                      )}
                      {c.status !== 'COMPLETED' && c.status !== 'CANCELED' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          title="Cancelar"
                          onClick={() => {
                            if (confirm(`Cancelar a campanha "${c.name}"?`)) {
                              applyAction.mutate({ id: c.id, action: 'cancel' });
                            }
                          }}
                        >
                          <XCircle className="size-4 text-red-600 dark:text-red-400" />
                        </Button>
                      )}
                      <Link
                        href={`/disparos-contatos/${c.id}`}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        title="Detalhe"
                      >
                        <ArrowUpRight className="size-4" />
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
