'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { StatTile } from './stat-tile';
import { DailyBars, type DailyPoint } from './daily-bars';
import { DeliveryFunnel, type FunnelData } from './delivery-funnel';
import { InstanceBarList, type InstanceStat } from './instance-bar-list';
import { CampaignsTable, type CampaignStat } from './campaigns-table';

const RANGES = [
  { id: '7d', label: '7 dias', days: 7 },
  { id: '30d', label: '30 dias', days: 30 },
  { id: '90d', label: '90 dias', days: 90 },
  { id: 'all', label: 'Tudo', days: null as number | null },
] as const;

type RangeId = (typeof RANGES)[number]['id'];

interface Overview {
  from: string;
  to: string;
  kpis: {
    totalDispatched: number;
    leads: number;
    buyers: number;
    unknown: number;
    deliveredPct: number | null;
    readPct: number | null;
    failed: number;
    runningCampaigns: number;
    failuresLast24h: number;
  };
  funnel: FunnelData;
  daily: DailyPoint[];
}

function rangeParams(rangeId: RangeId): { from: string; to: string } {
  const range = RANGES.find((r) => r.id === rangeId)!;
  const to = format(new Date(), 'yyyy-MM-dd');
  const from = range.days ? format(subDays(new Date(), range.days - 1), 'yyyy-MM-dd') : '2024-01-01';
  return { from, to };
}

const fmtPct = (v: number | null) =>
  v === null ? '—' : `${v.toFixed(1).replace('.', ',')}%`;

export default function DashboardPage() {
  const [rangeId, setRangeId] = useState<RangeId>('30d');
  const { from, to } = rangeParams(rangeId);

  const { data: overview, isLoading: loadingOverview } = useQuery<Overview>({
    queryKey: ['stats-overview', from, to],
    queryFn: async () => (await api.get('/stats/overview', { params: { from, to } })).data,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const { data: instances = [], isLoading: loadingInstances } = useQuery<InstanceStat[]>({
    queryKey: ['stats-instances', from, to],
    queryFn: async () => (await api.get('/stats/instances', { params: { from, to } })).data,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const { data: campaigns, isLoading: loadingCampaigns } = useQuery<{ items: CampaignStat[] }>({
    queryKey: ['stats-campaigns', from, to],
    queryFn: async () => (await api.get('/stats/campaigns', { params: { from, to } })).data,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const kpis = overview?.kpis;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Acompanhamento de disparos</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Janela:</span>
          <div className="flex items-center overflow-hidden rounded-md border">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRangeId(r.id)}
                className={`px-3 py-1 text-xs transition-colors ${
                  rangeId === r.id ? 'bg-brand text-brand-foreground' : 'hover:bg-muted'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {kpis && kpis.failuresLast24h > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle className="size-4 shrink-0" />
          <span className="flex-1">
            {kpis.failuresLast24h === 1
              ? '1 disparo com falha nas últimas 24h.'
              : `${kpis.failuresLast24h} disparos com falha nas últimas 24h.`}
          </span>
        </div>
      )}

      {loadingOverview || !overview ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[86px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatTile label="Total de disparos" value={kpis!.totalDispatched.toLocaleString('pt-BR')} />
          <StatTile
            label="Leads"
            value={kpis!.leads.toLocaleString('pt-BR')}
            dotColor="var(--chart-lead)"
            sub={overview.funnel.trackable ? undefined : 'só disparos 1:1'}
          />
          <StatTile
            label="Compradores"
            value={kpis!.buyers.toLocaleString('pt-BR')}
            dotColor="var(--chart-buyer)"
            sub={overview.funnel.trackable ? undefined : 'só disparos 1:1'}
          />
          <StatTile
            label="% Entregue"
            value={fmtPct(kpis!.deliveredPct)}
            sub={kpis!.deliveredPct === null ? 'só Cloud API' : undefined}
          />
          <StatTile
            label="% Lido"
            value={fmtPct(kpis!.readPct)}
            sub={kpis!.readPct === null ? 'só Cloud API' : undefined}
          />
          <StatTile
            label="Falhas"
            value={kpis!.failed.toLocaleString('pt-BR')}
            valueClassName={kpis!.failed > 0 ? 'text-red-700 dark:text-red-400' : undefined}
          />
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {loadingOverview || !overview ? (
            <Skeleton className="h-[320px]" />
          ) : (
            <DailyBars data={overview.daily} />
          )}
        </div>
        <div>
          {loadingOverview || !overview ? (
            <Skeleton className="h-[320px]" />
          ) : (
            <DeliveryFunnel funnel={overview.funnel} />
          )}
        </div>
      </div>

      {loadingInstances ? <Skeleton className="h-40" /> : <InstanceBarList items={instances} />}

      {loadingCampaigns || !campaigns ? (
        <Skeleton className="h-64" />
      ) : (
        <CampaignsTable items={campaigns.items} />
      )}
    </div>
  );
}
