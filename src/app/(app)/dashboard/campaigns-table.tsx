'use client';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowUpRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface CampaignStat {
  id: string;
  kind: 'GROUP' | 'CONTACT';
  name: string;
  audience: string | null;
  templateName: string | null;
  messageName: string | null;
  instanceLabels: string[];
  status: string;
  scheduleType?: string;
  startAt: string;
  progress: {
    total: number;
    sent: number;
    delivered: number | null;
    read: number | null;
    failed: number;
    pending: number;
    pct: number;
  };
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: 'Agendado', className: 'border-sky-300 text-sky-700 dark:border-sky-800 dark:text-sky-400' },
  RUNNING: { label: 'Ativo', className: 'border-brand/40 text-brand' },
  PAUSED: { label: 'Pausado', className: 'border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400' },
  COMPLETED: { label: 'Concluído', className: 'border-border text-muted-foreground' },
  FAILED: { label: 'Falhou', className: 'border-red-300 text-red-700 dark:border-red-800 dark:text-red-400' },
  CANCELED: { label: 'Cancelado', className: 'border-border text-muted-foreground line-through' },
};

const AUDIENCE_META: Record<string, { label: string; color: string }> = {
  LEAD: { label: 'Leads', color: 'var(--chart-lead)' },
  BUYER: { label: 'Compradores', color: 'var(--chart-buyer)' },
  ALL: { label: 'Todos', color: 'var(--chart-unknown)' },
};

export function CampaignsTable({ items }: { items: CampaignStat[] }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="px-4 pt-4">
        <h3 className="text-sm font-medium">Campanhas</h3>
      </div>
      <div className="mt-2 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Audiência</TableHead>
              <TableHead>Números</TableHead>
              <TableHead>Início</TableHead>
              <TableHead className="min-w-40">Progresso</TableHead>
              <TableHead className="text-center">Falhas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  Nenhuma campanha no período.
                </TableCell>
              </TableRow>
            )}
            {items.map((c) => {
              const status = STATUS_META[c.status] ?? STATUS_META.COMPLETED;
              const audience = c.audience ? AUDIENCE_META[c.audience] : null;
              const processed = c.progress.sent + c.progress.failed;
              return (
                <TableRow key={`${c.kind}-${c.id}`}>
                  <TableCell className="max-w-52 truncate font-medium" title={c.name}>
                    {c.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.kind === 'CONTACT' ? '1:1 oficial' : 'Grupos'}
                  </TableCell>
                  <TableCell>
                    {audience ? (
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: audience.color }} />
                        {audience.label}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-32 truncate text-xs text-muted-foreground" title={c.instanceLabels.join(', ')}>
                    {c.instanceLabels.length ? c.instanceLabels.join(', ') : '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                    {format(new Date(c.startAt), 'dd/MM HH:mm')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(c.progress.pct, 100)} className="w-24" />
                      <span className="whitespace-nowrap text-[11px] tabular-nums text-muted-foreground">
                        {processed.toLocaleString('pt-BR')}/{c.progress.total.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={cn(
                        'text-xs tabular-nums',
                        c.progress.failed > 0 ? 'font-medium text-red-700 dark:text-red-400' : 'text-muted-foreground',
                      )}
                    >
                      {c.progress.failed}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium',
                        status.className,
                      )}
                    >
                      {status.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={c.kind === 'CONTACT' ? `/disparos-contatos/${c.id}` : `/agendamentos/${c.id}`}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      title="Ver detalhe"
                    >
                      <ArrowUpRight className="size-4" />
                    </Link>
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
