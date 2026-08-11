'use client';
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

export interface GroupSegmentStat {
  slug: string;
  hardCap: number;
  autoCreate: boolean;
  totalGroups: number;
  fullGroups: number;
  current: { name: string; remoteId: string; participants: number | null } | null;
  futureReady: number;
  futureNames: string[];
}

const fmtInt = (v: number) => v.toLocaleString('pt-BR');

function situacao(s: GroupSegmentStat): { label: string; className: string } {
  const fillPct =
    s.current?.participants != null && s.hardCap > 0 ? s.current.participants / s.hardCap : 0;
  if (!s.current)
    return {
      label: 'sem grupo ativo',
      className: 'border-red-300 text-red-700 dark:border-red-800 dark:text-red-400',
    };
  if (s.futureReady === 0 && fillPct >= 0.8)
    return {
      label: 'criar próximo grupo',
      className: 'border-red-300 text-red-700 dark:border-red-800 dark:text-red-400',
    };
  if (s.futureReady === 0)
    return {
      label: 'sem grupo futuro',
      className: 'border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400',
    };
  return { label: 'ok', className: 'border-brand/40 text-brand' };
}

export function GroupsCard({ items }: { items: GroupSegmentStat[] }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-baseline justify-between px-4 pt-4">
        <h3 className="text-sm font-medium">Grupos por segmento</h3>
        <span className="text-[11px] text-muted-foreground">rotação via shortlink</span>
      </div>
      <div className="mt-2 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Segmento</TableHead>
              <TableHead>Grupo atual</TableHead>
              <TableHead className="min-w-44">Lotação</TableHead>
              <TableHead className="text-center">Futuros prontos</TableHead>
              <TableHead className="text-center">Lotados</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Nenhum shortlink ativo.
                </TableCell>
              </TableRow>
            )}
            {items.map((s) => {
              const st = situacao(s);
              const participants = s.current?.participants ?? null;
              const fillPct =
                participants != null && s.hardCap > 0
                  ? Math.min((participants / s.hardCap) * 100, 100)
                  : null;
              return (
                <TableRow key={s.slug}>
                  <TableCell className="font-medium">{s.slug}</TableCell>
                  <TableCell className="max-w-64 truncate text-sm" title={s.current?.name}>
                    {s.current?.name ?? '—'}
                  </TableCell>
                  <TableCell>
                    {fillPct !== null ? (
                      <div className="flex items-center gap-2">
                        <Progress
                          value={fillPct}
                          className={cn('w-24', fillPct >= 80 && '[&>div]:bg-red-500')}
                        />
                        <span className="whitespace-nowrap text-[11px] tabular-nums text-muted-foreground">
                          {fmtInt(participants!)}/{fmtInt(s.hardCap)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        sem contagem{s.current ? ` (cap ${fmtInt(s.hardCap)})` : ''}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={cn(
                        'text-sm tabular-nums',
                        s.futureReady === 0 ? 'font-medium text-red-700 dark:text-red-400' : undefined,
                      )}
                      title={s.futureNames.join(', ')}
                    >
                      {s.futureReady}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-sm tabular-nums text-muted-foreground">
                    {s.fullGroups}/{s.totalGroups}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium',
                        st.className,
                      )}
                    >
                      {st.label}
                    </span>
                    {s.autoCreate && (
                      <span className="ml-1.5 text-[10px] text-muted-foreground">auto-cria</span>
                    )}
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
