'use client';
import { Meter } from './meter';
import { cn } from '@/lib/utils';

export interface GroupSegmentStat {
  slug: string;
  hardCap: number;
  autoCreate: boolean;
  totalGroups: number;
  fullGroups: number;
  current: { name: string; remoteId: string; participants: number | null } | null;
  futureReady: number;
  futureMissing: number;
  futureNames: string[];
  health: 'ok' | 'warn' | 'critical';
}

const fmtInt = (v: number) => v.toLocaleString('pt-BR');

const HEALTH_META: Record<GroupSegmentStat['health'], { className: string }> = {
  ok: { className: 'border-brand/40 text-brand' },
  warn: { className: 'border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400' },
  critical: { className: 'border-red-300 text-red-700 dark:border-red-800 dark:text-red-400' },
};

function healthLabel(s: GroupSegmentStat): string {
  if (!s.current) return 'sem grupo ativo';
  if (s.health === 'critical') return 'criar próximo grupo JÁ';
  if (s.health === 'warn') return `faltam ${s.futureMissing} futuros`;
  return 'ok';
}

export function GroupsCard({ items, minFuture }: { items: GroupSegmentStat[]; minFuture: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium">Grupos por segmento</h3>
        <span className="text-[11px] text-muted-foreground">mínimo {minFuture} grupos futuros</span>
      </div>
      <div className="mt-3 space-y-4">
        {items.map((s) => {
          const participants = s.current?.participants ?? null;
          const fillPct =
            participants != null && s.hardCap > 0 ? Math.min((participants / s.hardCap) * 100, 100) : null;
          const meta = HEALTH_META[s.health];
          return (
            <div key={s.slug}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{s.slug}</span>
                <span
                  className={cn(
                    'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium',
                    meta.className,
                  )}
                >
                  {healthLabel(s)}
                </span>
              </div>
              <div className="mt-1 truncate text-xs text-muted-foreground" title={s.current?.name}>
                {s.current ? s.current.name : 'nenhum grupo ativo'}
                {s.autoCreate && <span className="ml-1.5 text-[10px]">· auto-cria</span>}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                {fillPct !== null ? (
                  <>
                    <Meter
                      pct={fillPct}
                      tone={fillPct >= 80 ? 'danger' : fillPct >= 60 ? 'warn' : 'brand'}
                      title={`${fmtInt(participants!)} de ${fmtInt(s.hardCap)} membros`}
                    />
                    <span className="whitespace-nowrap text-[11px] tabular-nums text-muted-foreground">
                      {fmtInt(participants!)}/{fmtInt(s.hardCap)}
                    </span>
                  </>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    sem contagem de membros (cap {fmtInt(s.hardCap)})
                  </span>
                )}
                <span className="flex items-center gap-1" title={s.futureNames.join(', ')}>
                  {Array.from({ length: minFuture }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        'inline-block size-2.5 rounded-full',
                        i < s.futureReady ? 'bg-brand' : 'border-[1.5px] border-muted-foreground/50',
                      )}
                    />
                  ))}
                  {s.futureReady > minFuture && (
                    <span className="text-[10px] text-muted-foreground">+{s.futureReady - minFuture}</span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[10.5px] text-muted-foreground">
        ● grupos futuros prontos · lotados: {items.map((s) => `${s.slug} ${s.fullGroups}/${s.totalGroups}`).join(' · ')}
      </p>
    </div>
  );
}
