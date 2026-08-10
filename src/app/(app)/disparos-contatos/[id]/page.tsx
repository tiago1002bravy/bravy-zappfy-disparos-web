'use client';
import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DeliveryFunnel } from '../../dashboard/delivery-funnel';
import { cn } from '@/lib/utils';

interface CampaignDetail {
  id: string;
  name: string;
  status: string;
  audience: string;
  templateName: string | null;
  startAt: string;
  completedAt: string | null;
  totalTargets: number;
  progressPct: number;
  funnel: {
    sent: number;
    delivered: number | null;
    read: number | null;
    failed: number;
    pending: number;
    trackable: boolean;
  };
  byInstance: Array<{
    instanceId: string;
    label: string;
    counts: { sent: number; delivered: number; read: number; failed: number };
  }>;
  topErrors: Array<{ errorCode: string | null; count: number }>;
}

interface CampaignMessageItem {
  id: string;
  phone: string;
  contactName: string | null;
  contactKind: 'LEAD' | 'BUYER';
  instanceLabel: string | null;
  status: string;
  errorCode: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
}

const MSG_STATUS_CLASSES: Record<string, string> = {
  PENDING: 'text-muted-foreground',
  QUEUED: 'text-sky-700 dark:text-sky-400',
  SENT: 'text-foreground',
  DELIVERED: 'text-brand',
  READ: 'text-brand font-medium',
  FAILED: 'text-red-700 dark:text-red-400 font-medium',
  SKIPPED: 'text-muted-foreground line-through',
};

export default function CampanhaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data: detail } = useQuery<CampaignDetail>({
    queryKey: ['stats-campaign', id],
    queryFn: async () => (await api.get(`/stats/campaigns/${id}`)).data,
    refetchInterval: 5000,
  });

  const { data: messages } = useQuery<{ items: CampaignMessageItem[]; nextCursor: string | null }>({
    queryKey: ['campaign-messages', id, statusFilter],
    queryFn: async () =>
      (
        await api.get(`/campaigns/${id}/messages`, {
          params: { ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}), limit: 100 },
        })
      ).data,
    refetchInterval: detail?.status === 'RUNNING' ? 5000 : false,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/disparos-contatos" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">{detail?.name ?? 'Campanha'}</h1>
          <p className="text-sm text-muted-foreground">
            {detail && (
              <>
                {detail.templateName && <span className="font-mono text-xs">{detail.templateName}</span>} ·{' '}
                {format(new Date(detail.startAt), 'dd/MM/yyyy HH:mm')} · {detail.status}
              </>
            )}
          </p>
        </div>
      </div>

      {detail && (
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
          <Progress value={Math.min(detail.progressPct, 100)} className="flex-1" />
          <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
            {detail.progressPct.toFixed(1).replace('.', ',')}% de {detail.totalTargets.toLocaleString('pt-BR')}
          </span>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {detail && <DeliveryFunnel funnel={detail.funnel} />}
        {detail && (
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-medium">Por número</h3>
            <div className="mt-3 space-y-2">
              {detail.byInstance.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum envio atribuído ainda.</p>
              )}
              {detail.byInstance.map((inst) => (
                <div key={inst.instanceId} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate">{inst.label}</span>
                  <span className="whitespace-nowrap tabular-nums text-muted-foreground">
                    {inst.counts.sent.toLocaleString('pt-BR')} enviados · {inst.counts.delivered} entregues ·{' '}
                    {inst.counts.read} lidos
                    {inst.counts.failed > 0 && (
                      <span className="ml-1 text-red-700 dark:text-red-400">· {inst.counts.failed} falhas</span>
                    )}
                  </span>
                </div>
              ))}
              {detail.topErrors.length > 0 && (
                <div className="mt-3 border-t pt-2">
                  <p className="text-xs font-medium">Erros mais comuns</p>
                  {detail.topErrors.map((e) => (
                    <div key={e.errorCode ?? 'null'} className="flex justify-between text-xs text-muted-foreground">
                      <span className="font-mono">{e.errorCode ?? 'sem código'}</span>
                      <span className="tabular-nums">{e.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Destinatários</h3>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'ALL')}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="PENDING">Pendentes</SelectItem>
              <SelectItem value="QUEUED">Na fila</SelectItem>
              <SelectItem value="SENT">Enviados</SelectItem>
              <SelectItem value="DELIVERED">Entregues</SelectItem>
              <SelectItem value="READ">Lidos</SelectItem>
              <SelectItem value="FAILED">Falhas</SelectItem>
              <SelectItem value="SKIPPED">Pulados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Contato</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Audiência</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enviado</TableHead>
                <TableHead>Erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(messages?.items ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Nenhum destinatário neste filtro.
                  </TableCell>
                </TableRow>
              )}
              {(messages?.items ?? []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="max-w-40 truncate text-xs">{m.contactName ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs">{m.phone}</TableCell>
                  <TableCell className="text-xs">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className="size-2 rounded-full"
                        style={{
                          backgroundColor: m.contactKind === 'BUYER' ? 'var(--chart-buyer)' : 'var(--chart-lead)',
                        }}
                      />
                      {m.contactKind === 'BUYER' ? 'Comprador' : 'Lead'}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-32 truncate text-xs text-muted-foreground">
                    {m.instanceLabel ?? '—'}
                  </TableCell>
                  <TableCell>
                    <span className={cn('text-xs', MSG_STATUS_CLASSES[m.status])}>{m.status}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                    {m.sentAt ? format(new Date(m.sentAt), 'dd/MM HH:mm:ss') : '—'}
                  </TableCell>
                  <TableCell className="max-w-52 truncate text-xs text-red-700 dark:text-red-400" title={m.errorMessage ?? undefined}>
                    {m.errorCode ? `${m.errorCode} · ` : ''}
                    {m.errorMessage ?? ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
