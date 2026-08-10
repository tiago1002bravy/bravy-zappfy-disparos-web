'use client';

export interface InstanceStat {
  id: string | null;
  label: string;
  provider: 'UAZAPI' | 'CLOUD_API';
  displayPhoneNumber: string | null;
  dailyCap: number | null;
  active: boolean;
  counts: {
    sent: number;
    delivered: number | null;
    read: number | null;
    failed: number;
  };
}

export function InstanceBarList({ items }: { items: InstanceStat[] }) {
  const max = Math.max(...items.map((i) => i.counts.sent), 1);
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-medium">Disparos por número</h3>
      {items.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
          Nenhuma instância cadastrada
        </div>
      ) : (
        <div className="mt-3 space-y-2.5">
          {items.map((inst, idx) => (
            <div key={inst.id ?? `removed-${idx}`}>
              <div className="flex items-center gap-2">
                <span className="w-44 shrink-0 truncate text-xs" title={inst.label}>
                  {inst.label}
                  {inst.provider === 'CLOUD_API' && (
                    <span className="ml-1.5 text-[10px] text-muted-foreground">Cloud API</span>
                  )}
                  {!inst.active && <span className="ml-1.5 text-[10px] text-muted-foreground">inativa</span>}
                </span>
                <div className="h-4 flex-1">
                  <div
                    className="h-full rounded-r-[4px]"
                    style={{
                      backgroundColor: 'var(--chart-2)',
                      width: `${Math.max((inst.counts.sent / max) * 100, inst.counts.sent > 0 ? 1.5 : 0)}%`,
                    }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-xs tabular-nums">
                  {inst.counts.sent.toLocaleString('pt-BR')}
                </span>
              </div>
              {(inst.counts.failed > 0 || inst.counts.delivered !== null) && (
                <div className="mt-0.5 flex gap-3 pl-[11.5rem] text-[10px] text-muted-foreground">
                  {inst.counts.delivered !== null && <span>entregues {inst.counts.delivered.toLocaleString('pt-BR')}</span>}
                  {inst.counts.read !== null && <span>lidos {inst.counts.read.toLocaleString('pt-BR')}</span>}
                  {inst.counts.failed > 0 && (
                    <span className="text-red-700 dark:text-red-400">falhas {inst.counts.failed.toLocaleString('pt-BR')}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
