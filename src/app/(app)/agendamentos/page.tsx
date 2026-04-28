'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Pause, Play, X, Trash2 } from 'lucide-react';

function Countdown({ target }: { target: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return <span className="text-xs text-zinc-400">disparando…</span>;
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  let label = '';
  if (d > 0) label = `${d}d ${h}h`;
  else if (h > 0) label = `${h}h ${String(m).padStart(2, '0')}m`;
  else label = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const urgent = ms < 60_000;
  return (
    <span className={`text-xs font-mono tabular-nums ${urgent ? 'text-orange-500' : 'text-zinc-500'}`}>
      {label}
    </span>
  );
}

interface Schedule {
  id: string;
  type: 'ONCE' | 'DAILY' | 'WEEKLY' | 'CUSTOM_CRON';
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELED';
  startAt: string;
  cron: string | null;
  instanceName: string;
  groupRemoteIds: string[];
  message: { id: string; name: string };
  _count: { executions: number };
}

const STATUS_COLOR: Record<Schedule['status'], string> = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 dark:text-emerald-400',
  PAUSED: 'bg-amber-500/15 text-amber-700 border border-amber-500/30 dark:text-amber-400',
  COMPLETED: 'bg-zinc-500/15 text-zinc-700 border border-zinc-500/30 dark:text-zinc-300',
  CANCELED: 'bg-red-500/15 text-red-700 border border-red-500/30 dark:text-red-400',
};

export default function AgendamentosPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery<Schedule[]>({
    queryKey: ['schedules'],
    queryFn: async () => (await api.get('/schedules')).data,
    refetchInterval: 5000,
  });

  const action = useMutation({
    mutationFn: async (params: { id: string; action: 'pause' | 'resume' | 'cancel' }) => {
      await api.patch(`/schedules/${params.id}`, { action: params.action });
    },
    onSuccess: () => {
      toast.success('Atualizado');
      qc.invalidateQueries({ queryKey: ['schedules'] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/schedules/${id}`),
    onSuccess: () => {
      toast.success('Removido');
      qc.invalidateQueries({ queryKey: ['schedules'] });
    },
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 pb-5 border-b">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Agendamentos</h1>
          <p className="text-sm text-muted-foreground">Disparos únicos ou recorrentes</p>
        </div>
        <Link href="/agendamentos/novo">
          <Button>
            <Plus className="size-4 mr-2" />
            Novo agendamento
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="py-3">Mensagem</TableHead>
              <TableHead className="py-3">Instância</TableHead>
              <TableHead className="py-3">Tipo</TableHead>
              <TableHead className="py-3">Início</TableHead>
              <TableHead className="py-3">Cron</TableHead>
              <TableHead className="text-right py-3">Grupos</TableHead>
              <TableHead className="text-right py-3">Execuções</TableHead>
              <TableHead className="py-3">Status</TableHead>
              <TableHead className="w-44 text-right py-3 pr-4">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                  Nenhum agendamento.
                </TableCell>
              </TableRow>
            )}
            {data.map((s) => (
              <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium align-top py-4">
                  <Link href={`/agendamentos/${s.id}`} className="hover:underline">
                    {s.message.name}
                  </Link>
                </TableCell>
                <TableCell className="align-top py-4 text-muted-foreground text-xs font-mono truncate max-w-[12rem]" title={s.instanceName}>
                  {s.instanceName}
                </TableCell>
                <TableCell className="align-top py-4">
                  <Badge variant="outline" className="text-[10px] font-medium tracking-wide">
                    {s.type}
                  </Badge>
                </TableCell>
                <TableCell className="align-top py-4 tabular-nums text-sm">{new Date(s.startAt).toLocaleString('pt-BR')}</TableCell>
                <TableCell className="align-top py-4 text-xs font-mono text-muted-foreground">{s.cron ?? '—'}</TableCell>
                <TableCell className="text-right align-top py-4 tabular-nums">{s.groupRemoteIds.length}</TableCell>
                <TableCell className="text-right align-top py-4 tabular-nums">{s._count.executions}</TableCell>
                <TableCell className="align-top py-4">
                  <Badge className={STATUS_COLOR[s.status]}>{s.status}</Badge>
                </TableCell>
                <TableCell className="text-right align-top py-3 pr-3">
                  <div className="flex items-center justify-end gap-2">
                    {s.status === 'ACTIVE' && s.type === 'ONCE' && (
                      <div className="hidden xl:flex items-center pr-1">
                        <Countdown target={s.startAt} />
                      </div>
                    )}
                    <div className="flex items-center gap-0.5 rounded-md border border-zinc-300 dark:border-zinc-600 bg-background/50">
                      {s.status === 'ACTIVE' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-r-none"
                          onClick={() => action.mutate({ id: s.id, action: 'pause' })}
                          title="Pausar"
                        >
                          <Pause className="size-4" />
                        </Button>
                      )}
                      {s.status === 'PAUSED' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-r-none"
                          onClick={() => action.mutate({ id: s.id, action: 'resume' })}
                          title="Retomar"
                        >
                          <Play className="size-4" />
                        </Button>
                      )}
                      {(s.status === 'ACTIVE' || s.status === 'PAUSED') && (
                        <>
                          <div className="h-5 w-px bg-zinc-300 dark:bg-zinc-600" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-l-none text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                            onClick={() => action.mutate({ id: s.id, action: 'cancel' })}
                            title="Cancelar"
                          >
                            <X className="size-4" />
                          </Button>
                        </>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm('Remover permanentemente?')) remove.mutate(s.id);
                      }}
                      title="Excluir"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
