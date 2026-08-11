'use client';
import { useState } from 'react';
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

export interface FlowSeries {
  granularity: 'hour' | 'day';
  points: Array<{ bucket: string; sent: number }>;
}

export type FlowRangeId = 'today' | 'yesterday' | '7d' | 'custom';

export const FLOW_RANGES: Array<{ id: FlowRangeId; label: string }> = [
  { id: 'today', label: 'Hoje' },
  { id: 'yesterday', label: 'Ontem' },
  { id: '7d', label: '7 dias' },
  { id: 'custom', label: 'Personalizado' },
];

const AUDIENCE_META: Record<string, { label: string; color: string }> = {
  LEAD: { label: 'Leads', color: 'var(--chart-lead)' },
  BUYER: { label: 'Compradores', color: 'var(--chart-buyer)' },
  ALL: { label: 'Todos', color: 'var(--chart-unknown)' },
};

const fmtInt = (v: number) => v.toLocaleString('pt-BR');
const fmtUsd = (v: number) =>
  `US$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function SuccessBars({ items }: { items: FlowStat[] }) {
  const withData = items.filter((f) => f.attempts > 0);
  const max = Math.max(...withData.map((f) => f.success + f.failed), 1);
  if (withData.length === 0) {
    return <div className="flex h-24 items-center text-xs text-muted-foreground">Nenhum envio no período.</div>;
  }
  return (
    <div className="space-y-2">
      {withData.map((f) => (
        <div key={f.flowId ?? 'manual'} className="flex items-center gap-2">
          <span className="w-40 shrink-0 truncate text-xs" title={f.name}>
            {f.name}
          </span>
          <div className="flex h-3.5 flex-1 items-center gap-px">
            <div
              className="h-full rounded-r-[3px] bg-brand/80"
              style={{ width: `${Math.max((f.success / max) * 100, f.success > 0 ? 1.5 : 0)}%` }}
              title={`${f.name}: ${fmtInt(f.success)} enviados`}
            />
            {f.failed > 0 && (
              <div
                className="h-full rounded-r-[3px] bg-red-500"
                style={{ width: `${Math.max((f.failed / max) * 100, 1.5)}%` }}
                title={`${f.name}: ${fmtInt(f.failed)} falhas`}
              />
            )}
          </div>
          <span className="w-12 shrink-0 text-right text-xs tabular-nums">{fmtInt(f.success)}</span>
        </div>
      ))}
    </div>
  );
}

function SeriesChart({ series }: { series: FlowSeries }) {
  const points = series.points;
  if (points.length === 0) {
    return <div className="flex h-24 items-center text-xs text-muted-foreground">Nenhum envio no período.</div>;
  }
  const max = Math.max(...points.map((p) => p.sent), 1);
  const label = (bucket: string) =>
    series.granularity === 'hour' ? bucket.replace(':00', 'h') : bucket.slice(8) + '/' + bucket.slice(5, 7);
  return (
    <div>
      <div className="flex h-24 items-end gap-1">
        {points.map((p) => (
          <div
            key={p.bucket}
            className="min-w-2 flex-1 rounded-t-[3px] bg-brand/80"
            style={{ height: `${Math.max((p.sent / max) * 100, 2)}%` }}
            title={`${label(p.bucket)}: ${fmtInt(p.sent)} enviados`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
        <span>{label(points[0].bucket)}</span>
        {points.length > 2 && <span>{label(points[Math.floor(points.length / 2)].bucket)}</span>}
        <span>{label(points[points.length - 1].bucket)}</span>
      </div>
    </div>
  );
}

interface FlowsSectionProps {
  items: FlowStat[];
  totalCostUsd: number;
  series: FlowSeries;
  rangeId: FlowRangeId;
  onRangeChange: (id: FlowRangeId) => void;
  custom: { from: string; to: string };
  onCustomChange: (v: { from: string; to: string }) => void;
}

export function FlowsSection({
  items,
  totalCostUsd,
  series,
  rangeId,
  onRangeChange,
  custom,
  onCustomChange,
}: FlowsSectionProps) {
  const [showIdle, setShowIdle] = useState(false);
  const activeItems = items.filter((f) => f.attempts > 0 || f.costUsd > 0);
  const idleItems = items.filter((f) => f.attempts === 0 && f.costUsd === 0);
  const visible = showIdle ? items : activeItems;

  const totals = visible.reduce(
    (acc, i) => ({
      attempts: acc.attempts + i.attempts,
      success: acc.success + i.success,
      failed: acc.failed + i.failed,
    }),
    { attempts: 0, success: 0, failed: 0 },
  );

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
        <div>
          <h3 className="text-sm font-medium">API oficial — por fluxo</h3>
          <span className="text-[11px] text-muted-foreground">
            custo estimado: tabela Meta BR por mensagem enviada
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-md border">
            {FLOW_RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onRangeChange(r.id)}
                className={cn(
                  'px-3 py-1 text-xs transition-colors',
                  rangeId === r.id ? 'bg-brand text-brand-foreground' : 'hover:bg-muted',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          {rangeId === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={custom.from}
                max={custom.to}
                onChange={(e) => onCustomChange({ ...custom, from: e.target.value })}
                className="rounded-md border bg-background px-2 py-1 text-xs"
              />
              <span className="text-xs text-muted-foreground">a</span>
              <input
                type="date"
                value={custom.to}
                min={custom.from}
                onChange={(e) => onCustomChange({ ...custom, to: e.target.value })}
                className="rounded-md border bg-background px-2 py-1 text-xs"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 px-4 pt-4 md:grid-cols-2">
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            Sucesso por fluxo
          </div>
          <SuccessBars items={items} />
        </div>
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            Envios {series.granularity === 'hour' ? 'por hora' : 'por dia'}
          </div>
          <SeriesChart series={series} />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
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
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Nenhum fluxo com atividade no período.
                </TableCell>
              </TableRow>
            )}
            {visible.map((f) => {
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
            {visible.length > 0 && (
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
      {idleItems.length > 0 && (
        <div className="px-4 pb-3 pt-1">
          <button
            type="button"
            onClick={() => setShowIdle((v) => !v)}
            className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
          >
            {showIdle
              ? 'ocultar fluxos sem atividade'
              : `mostrar ${idleItems.length} fluxo${idleItems.length > 1 ? 's' : ''} sem atividade no período`}
          </button>
        </div>
      )}
    </div>
  );
}
