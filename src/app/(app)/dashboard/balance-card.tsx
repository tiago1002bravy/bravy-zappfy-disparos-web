'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface InstanceStat {
  id: string | null;
  label: string;
  provider: 'UAZAPI' | 'CLOUD_API';
  displayPhoneNumber: string | null;
  dailyCap: number | null;
  active: boolean;
  budget?: { cap: number; sentLast24h: number; balance: number };
  wallet?: {
    balanceUsd: number;
    avgDailyCostUsd: number;
    daysLeft: number | null;
    lastTopUpAt: string;
  } | null;
  counts: { sent: number; delivered: number | null; read: number | null; failed: number };
}

const fmtUsd = (v: number) =>
  `US$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function TopUpForm({ instanceId, onDone }: { instanceId: string; onDone: () => void }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () =>
      api.post('/credits', { instanceId, amountUsd: Number(amount), note: note || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stats-instances'] });
      onDone();
    },
  });
  return (
    <form
      className="mt-2 flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (Number(amount) !== 0) mutation.mutate();
      }}
    >
      <input
        type="number"
        step="0.01"
        required
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Valor US$"
        className="w-28 rounded-md border bg-background px-2 py-1.5 text-xs"
      />
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Nota (ex.: recarga GHL)"
        className="w-40 rounded-md border bg-background px-2 py-1.5 text-xs"
      />
      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground disabled:opacity-50"
      >
        {mutation.isPending ? 'Salvando…' : 'Salvar'}
      </button>
      {mutation.isError && <span className="text-xs text-red-600">erro ao salvar</span>}
    </form>
  );
}

export function BalanceCard({ items }: { items: InstanceStat[] }) {
  const [openForm, setOpenForm] = useState<string | null>(null);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium">Saldo pra disparar</h3>
        <span className="text-[11px] text-muted-foreground">financeiro estimado + limite 24h</span>
      </div>
      <div className="mt-3 space-y-4">
        {items.map((inst) => {
          const b = inst.budget;
          const w = inst.wallet;
          const usedPct = b ? Math.min(((b.cap - b.balance) / b.cap) * 100, 100) : 0;
          const lowCap = b ? b.balance / b.cap < 0.2 : false;
          const lowMoney = w != null && w.daysLeft !== null && w.daysLeft < 2;
          return (
            <div key={inst.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium">
                  {inst.label}
                  {!inst.active && <span className="ml-1.5 text-[10px] text-muted-foreground">inativa</span>}
                </span>
                {w ? (
                  <span
                    className={cn(
                      'text-sm font-semibold tabular-nums',
                      lowMoney || w.balanceUsd <= 0 ? 'text-red-700 dark:text-red-400' : undefined,
                    )}
                  >
                    {fmtUsd(w.balanceUsd)}
                    <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                      {w.daysLeft !== null
                        ? `~${w.daysLeft.toLocaleString('pt-BR')} dias no ritmo atual`
                        : 'sem consumo em 7 dias'}
                    </span>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">saldo financeiro não registrado</span>
                )}
              </div>
              {(lowMoney || (w && w.balanceUsd <= 0)) && (
                <div className="mt-1 inline-flex items-center rounded-md border border-red-300 bg-red-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-red-700 dark:border-red-800 dark:text-red-400">
                  RECARREGAR — {w!.balanceUsd <= 0 ? 'saldo esgotado' : 'menos de 2 dias de saldo'}
                </div>
              )}
              {b && (
                <div className="mt-1.5 flex items-center gap-2">
                  <Progress
                    value={usedPct}
                    className={cn('h-2 flex-1', lowCap && '[&>div]:bg-red-500')}
                  />
                  <span
                    className={cn(
                      'whitespace-nowrap text-[11px] tabular-nums',
                      lowCap ? 'font-semibold text-red-700 dark:text-red-400' : 'text-muted-foreground',
                    )}
                  >
                    {b.balance.toLocaleString('pt-BR')}/{b.cap.toLocaleString('pt-BR')} disparos livres (24h)
                    {lowCap && ' — BAIXO'}
                  </span>
                </div>
              )}
              <div className="mt-1">
                {openForm === inst.id ? (
                  <TopUpForm instanceId={inst.id!} onDone={() => setOpenForm(null)} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setOpenForm(inst.id)}
                    className="text-[11px] text-brand underline-offset-2 hover:underline"
                  >
                    {inst.wallet ? 'registrar recarga' : 'registrar saldo atual'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[10.5px] leading-relaxed text-muted-foreground">
        O saldo financeiro é um ledger: registre o valor carregado no BSP e o dashboard desconta o custo
        estimado de cada envio (tabela Meta BR). O limite 24h é a capacidade de disparo do número.
      </p>
    </div>
  );
}
