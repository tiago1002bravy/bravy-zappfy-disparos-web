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
  ACTIVE: 'bg-green-500',
  PAUSED: 'bg-yellow-500',
  COMPLETED: 'bg-zinc-500',
  CANCELED: 'bg-red-500',
};

export default function AgendamentosPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery<Schedule[]>({
    queryKey: ['schedules'],
    queryFn: async () => (await api.get('/schedules')).data,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Agendamentos</h1>
          <p className="text-sm text-zinc-500">Disparos únicos ou recorrentes</p>
        </div>
        <Link href="/agendamentos/novo">
          <Button>
            <Plus className="size-4 mr-2" />
            Novo agendamento
          </Button>
        </Link>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mensagem</TableHead>
              <TableHead>Instância</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Cron</TableHead>
              <TableHead className="text-right">Grupos</TableHead>
              <TableHead className="text-right">Execuções</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-40 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-zinc-500">
                  Nenhum agendamento.
                </TableCell>
              </TableRow>
            )}
            {data.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
                  <Link href={`/agendamentos/${s.id}`} className="hover:underline">
                    {s.message.name}
                  </Link>
                </TableCell>
                <TableCell>{s.instanceName}</TableCell>
                <TableCell>{s.type}</TableCell>
                <TableCell>{new Date(s.startAt).toLocaleString('pt-BR')}</TableCell>
                <TableCell className="text-xs font-mono">{s.cron ?? '-'}</TableCell>
                <TableCell className="text-right">{s.groupRemoteIds.length}</TableCell>
                <TableCell className="text-right">{s._count.executions}</TableCell>
                <TableCell>
                  <Badge className={STATUS_COLOR[s.status]}>{s.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {s.status === 'ACTIVE' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => action.mutate({ id: s.id, action: 'pause' })}
                      >
                        <Pause className="size-4" />
                      </Button>
                    )}
                    {s.status === 'PAUSED' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => action.mutate({ id: s.id, action: 'resume' })}
                      >
                        <Play className="size-4" />
                      </Button>
                    )}
                    {s.status === 'ACTIVE' && s.type === 'ONCE' && (
                      <Countdown target={s.startAt} />
                    )}
                    {(s.status === 'ACTIVE' || s.status === 'PAUSED') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => action.mutate({ id: s.id, action: 'cancel' })}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Remover permanentemente?')) remove.mutate(s.id);
                      }}
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
