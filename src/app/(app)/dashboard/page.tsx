'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { BalanceCard } from './balance-card';
import type { InstanceStat } from './balance-card';
import { GroupsCard, type GroupSegmentStat } from './groups-card';
import { FlowsSection, type FlowStat, type FlowRangeId, type FlowSeries } from './flows-table';

export default function DashboardPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [flowRangeId, setFlowRangeId] = useState<FlowRangeId>('today');
  const [flowCustom, setFlowCustom] = useState({ from: today, to: today });
  const flowParams = (() => {
    if (flowRangeId === 'today') return { from: today, to: today };
    if (flowRangeId === 'yesterday') {
      const y = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      return { from: y, to: y };
    }
    if (flowRangeId === '7d') return { from: format(subDays(new Date(), 6), 'yyyy-MM-dd'), to: today };
    return flowCustom;
  })();

  const { data: instances, isLoading: loadingInstances } = useQuery<InstanceStat[]>({
    queryKey: ['stats-instances'],
    queryFn: async () => (await api.get('/stats/instances')).data,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const { data: groupStats, isLoading: loadingGroups } = useQuery<{
    items: GroupSegmentStat[];
    minFuture: number;
  }>({
    queryKey: ['stats-groups'],
    queryFn: async () => (await api.get('/stats/groups')).data,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const { data: flowStats, isLoading: loadingFlows } = useQuery<{
    items: FlowStat[];
    totalCostUsd: number;
    series: FlowSeries;
  }>({
    queryKey: ['stats-flows', flowParams.from, flowParams.to],
    queryFn: async () => (await api.get('/stats/flows', { params: flowParams })).data,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const cloudInstances = (instances ?? []).filter((i) => i.provider === 'CLOUD_API');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Disparos via API oficial</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {loadingInstances || !instances ? (
          <Skeleton className="h-52" />
        ) : (
          <BalanceCard items={cloudInstances} />
        )}
        {loadingGroups || !groupStats ? (
          <Skeleton className="h-52" />
        ) : (
          <GroupsCard items={groupStats.items} minFuture={groupStats.minFuture} />
        )}
      </div>

      {loadingFlows || !flowStats ? (
        <Skeleton className="h-96" />
      ) : (
        <FlowsSection
          items={flowStats.items}
          totalCostUsd={flowStats.totalCostUsd}
          series={flowStats.series}
          rangeId={flowRangeId}
          onRangeChange={setFlowRangeId}
          custom={flowCustom}
          onCustomChange={setFlowCustom}
        />
      )}
    </div>
  );
}
