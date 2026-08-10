'use client';
import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  lead: number;
  buyer: number;
  unknown: number;
}

const SERIES = [
  { key: 'lead', label: 'Leads', color: 'var(--chart-lead)' },
  { key: 'buyer', label: 'Compradores', color: 'var(--chart-buyer)' },
  { key: 'unknown', label: 'Grupos', color: 'var(--chart-unknown)' },
] as const;

function niceCeil(n: number): number {
  if (n <= 10) return 10;
  const pow = 10 ** Math.floor(Math.log10(n));
  const unit = n / pow;
  const nice = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10;
  return nice * pow;
}

export function DailyBars({ data }: { data: DailyPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const visibleSeries = useMemo(
    () => SERIES.filter((s) => data.some((d) => d[s.key] > 0)),
    [data],
  );
  const totals = data.map((d) => d.lead + d.buyer + d.unknown);
  const max = niceCeil(Math.max(...totals, 1));
  const empty = totals.every((t) => t === 0);
  // Labels do eixo X esparsos pra não colidir (~6 no máximo)
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Disparos por dia</h3>
        {visibleSeries.length >= 2 && (
          <div className="flex items-center gap-3">
            {visibleSeries.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {empty ? (
        <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
          Sem disparos no período
        </div>
      ) : (
        <div className="mt-3">
          <div className="relative h-56">
            {/* Grid recessivo: 3 linhas + baseline */}
            {[0, 0.5, 1].map((f) => (
              <div
                key={f}
                aria-hidden
                className="absolute inset-x-0 border-t border-border/60"
                style={{ bottom: `${f * 100}%` }}
              />
            ))}
            <span className="absolute -top-2 right-full mr-1.5 text-[10px] text-muted-foreground tabular-nums">
              {max.toLocaleString('pt-BR')}
            </span>
            <div className="absolute inset-0 flex items-end gap-px" onMouseLeave={() => setHovered(null)}>
              {data.map((d, i) => {
                const total = d.lead + d.buyer + d.unknown;
                return (
                  <div
                    key={d.date}
                    className="group relative flex h-full flex-1 items-end justify-center"
                    onMouseEnter={() => setHovered(i)}
                  >
                    {/* Alvo de hover maior que a marca */}
                    <div className="absolute inset-0" />
                    <div
                      className="flex w-full max-w-6 flex-col-reverse gap-0.5"
                      style={{ height: `${(total / max) * 100}%` }}
                    >
                      {visibleSeries
                        .filter((s) => d[s.key] > 0)
                        .map((s, idx, arr) => (
                          <div
                            key={s.key}
                            style={{
                              backgroundColor: s.color,
                              flexGrow: d[s.key],
                              flexBasis: 0,
                            }}
                            className={idx === arr.length - 1 ? 'rounded-t-[4px]' : ''}
                          />
                        ))}
                    </div>
                    {hovered === i && total > 0 && (
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                        <div className="font-medium">{format(parseISO(d.date), 'dd/MM')}</div>
                        {visibleSeries.map((s) => (
                          <div key={s.key} className="flex items-center gap-1.5 text-muted-foreground">
                            <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.label}: <span className="tabular-nums text-foreground">{d[s.key].toLocaleString('pt-BR')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-1 flex gap-px">
            {data.map((d, i) => (
              <div key={d.date} className="flex-1 text-center text-[10px] text-muted-foreground">
                {i % labelEvery === 0 ? format(parseISO(d.date), 'dd/MM') : ''}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
