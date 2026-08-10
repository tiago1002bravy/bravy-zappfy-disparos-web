'use client';
import { Info, XCircle } from 'lucide-react';

export interface FunnelData {
  sent: number;
  delivered: number | null;
  read: number | null;
  failed: number;
  pending: number;
  trackable: boolean;
}

function FunnelRow({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: number;
  pct: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="h-6 flex-1">
        <div
          className="h-full rounded-r-[4px]"
          style={{ backgroundColor: color, width: `${Math.max(pct, value > 0 ? 2 : 0)}%` }}
        />
      </div>
      <span className="w-28 shrink-0 text-right text-xs tabular-nums">
        {value.toLocaleString('pt-BR')}{' '}
        <span className="text-muted-foreground">({pct.toFixed(1).replace('.', ',')}%)</span>
      </span>
    </div>
  );
}

export function DeliveryFunnel({ funnel }: { funnel: FunnelData }) {
  const base = Math.max(funnel.sent, 1);
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-medium">Funil de entrega</h3>
      <div className="mt-4 space-y-2">
        <FunnelRow label="Enviado" value={funnel.sent} pct={funnel.sent > 0 ? 100 : 0} color="var(--chart-2)" />
        {funnel.trackable && funnel.delivered !== null && (
          <FunnelRow
            label="Entregue"
            value={funnel.delivered}
            pct={(funnel.delivered / base) * 100}
            color="var(--chart-3)"
          />
        )}
        {funnel.trackable && funnel.read !== null && (
          <FunnelRow label="Lido" value={funnel.read} pct={(funnel.read / base) * 100} color="var(--chart-4)" />
        )}
      </div>
      <div className="mt-4 space-y-1.5 border-t pt-3 text-xs">
        <div className="flex items-center gap-1.5 text-red-700 dark:text-red-400">
          <XCircle className="size-3.5 shrink-0" />
          Falhas
          <span className="ml-auto tabular-nums">{funnel.failed.toLocaleString('pt-BR')}</span>
        </div>
        {funnel.pending > 0 && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            Pendentes
            <span className="ml-auto tabular-nums">{funnel.pending.toLocaleString('pt-BR')}</span>
          </div>
        )}
      </div>
      {!funnel.trackable && (
        <div className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Info className="mt-0.5 size-3 shrink-0" />
          Entrega e leitura dependem do webhook da Meta apontar pra este sistema — acompanhando envios e
          falhas.
        </div>
      )}
    </div>
  );
}
