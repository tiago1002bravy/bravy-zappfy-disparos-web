'use client';
import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Execution {
  id: string;
  ranAt: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  groupRemoteId: string | null;
  errorMessage: string | null;
}

const COLOR: Record<string, string> = {
  SUCCESS: 'bg-brand text-brand-foreground',
  FAILED: 'bg-red-500 text-white',
  SKIPPED: 'bg-amber-400 text-foreground',
};

export default function ScheduleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: schedule } = useQuery({
    queryKey: ['schedule', id],
    queryFn: async () => (await api.get(`/schedules/${id}`)).data,
  });
  const { data: executions = [] } = useQuery<Execution[]>({
    queryKey: ['schedule-executions', id],
    queryFn: async () => (await api.get(`/schedules/${id}/executions`)).data,
    refetchInterval: 5_000,
  });

  if (!schedule) return <div>Carregando...</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">{schedule.message.name}</h1>
        <p className="text-sm text-muted-foreground">
          {schedule.type} · {schedule.cron ?? new Date(schedule.startAt).toLocaleString('pt-BR')} ·{' '}
          <Badge>{schedule.status}</Badge>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Execuções ({executions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhuma execução ainda.
                  </TableCell>
                </TableRow>
              )}
              {executions.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{new Date(e.ranAt).toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="font-mono text-xs">{e.groupRemoteId}</TableCell>
                  <TableCell>
                    <Badge className={COLOR[e.status]}>{e.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-red-600 dark:text-red-400">
                    <div className="line-clamp-2 max-w-md whitespace-pre-wrap" title={e.errorMessage ?? ''}>
                      {e.errorMessage}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
