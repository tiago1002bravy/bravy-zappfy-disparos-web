'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface FlowStat {
  flowId: string | null;
  name: string;
  slug: string | null;
  active: boolean;
  instanceLabel: string | null;
  audience: 'LEAD' | 'BUYER' | 'ALL';
  attempts: number;
  success: number;
  failed: number;
  costUsd: number;
}

const AUDIENCE_META: Record<string, { label: string; color: string }> = {
  LEAD: { label: 'Leads', color: 'var(--chart-lead)' },
  BUYER: { label: 'Compradores', color: 'var(--chart-buyer)' },
  ALL: { label: 'Todos', color: 'var(--chart-unknown)' },
};

const fmtInt = (v: number) => v.toLocaleString('pt-BR');
const fmtUsd = (v: number) =>
  `US$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function FlowsTable({ items, totalCostUsd }: { items: FlowStat[]; totalCostUsd: number }) {
  const totals = items.reduce(
    (acc, i) => ({
      attempts: acc.attempts + i.attempts,
      success: acc.success + i.success,
      failed: acc.failed + i.failed,
    }),
    { attempts: 0, success: 0, failed: 0 },
  );

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-baseline justify-between px-4 pt-4">
        <h3 className="text-sm font-medium">API oficial — por fluxo</h3>
        <span className="text-[11px] text-muted-foreground">
          custo estimado: tabela Meta BR por mensagem enviada
        </span>
      </div>
      <div className="mt-2 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Fluxo</TableHead>
              <TableHead>Audiência</TableHead>
              <TableHead>Número</TableHead>
              <TableHead className="text-right">Tentativas</TableHead>
              <TableHead className="text-right">Sucesso</TableHead>
              <TableHead className="text-right">Erro</TableHead>
              <TableHead className="text-right">Custo (US$)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Nenhum fluxo cadastrado.
                </TableCell>
              </TableRow>
            )}
            {items.map((f) => {
              const audience = AUDIENCE_META[f.audience] ?? AUDIENCE_META.ALL;
              return (
                <TableRow key={f.flowId ?? 'manual'} className={cn(!f.active && 'opacity-50')}>
                  <TableCell className="max-w-64 truncate font-medium" title={f.slug ?? f.name}>
                    {f.name}
                    {!f.active && (
                      <span className="ml-2 text-[11px] font-normal text-muted-foreground">inativo</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span
                        aria-hidden
                        className="size-2 rounded-full"
                        style={{ backgroundColor: audience.color }}
                      />
                      {audience.label}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-32 truncate text-xs text-muted-foreground">
                    {f.instanceLabel ?? '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{fmtInt(f.attempts)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{fmtInt(f.success)}</TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        'text-sm tabular-nums',
                        f.failed > 0 ? 'font-medium text-red-700 dark:text-red-400' : 'text-muted-foreground',
                      )}
                    >
                      {fmtInt(f.failed)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{fmtUsd(f.costUsd)}</TableCell>
                </TableRow>
              );
            })}
            {items.length > 0 && (
              <TableRow className="bg-muted/40 font-medium hover:bg-muted/40">
                <TableCell colSpan={3}>Total</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{fmtInt(totals.attempts)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{fmtInt(totals.success)}</TableCell>
                <TableCell
                  className={cn(
                    'text-right text-sm tabular-nums',
                    totals.failed > 0 && 'text-red-700 dark:text-red-400',
                  )}
                >
                  {fmtInt(totals.failed)}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">{fmtUsd(totalCostUsd)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
