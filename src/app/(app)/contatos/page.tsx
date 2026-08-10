'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface Contact {
  id: string;
  phone: string;
  kind: 'LEAD' | 'BUYER';
  name: string | null;
  email: string | null;
  source: string;
  boughtAt: string | null;
  lastSeenAt: string | null;
  syncedAt: string;
}

interface ContactCounts {
  leads: number;
  buyers: number;
  total: number;
  lastSyncedAt: string | null;
  lastRunStatus: string | null;
  lastRunError: string | null;
  lastRunUpserts: number;
  lastFullSyncAt: string | null;
}

const KIND_META = {
  LEAD: { label: 'Lead', color: 'var(--chart-lead)' },
  BUYER: { label: 'Comprador', color: 'var(--chart-buyer)' },
} as const;

function formatPhone(phone: string): string {
  const m = phone.match(/^55(\d{2})(\d{5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : phone;
}

export default function ContatosPage() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<'ALL' | 'LEAD' | 'BUYER'>('ALL');
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');

  const { data: counts } = useQuery<ContactCounts>({
    queryKey: ['contacts-counts'],
    queryFn: async () => (await api.get('/contacts/counts')).data,
    refetchInterval: 30_000,
  });

  const { data, isLoading } = useQuery<{ items: Contact[]; nextCursor: string | null }>({
    queryKey: ['contacts', kind, submittedSearch],
    queryFn: async () =>
      (
        await api.get('/contacts', {
          params: {
            ...(kind !== 'ALL' ? { kind } : {}),
            ...(submittedSearch ? { search: submittedSearch } : {}),
            limit: 100,
          },
        })
      ).data,
  });

  const syncNow = useMutation({
    mutationFn: async () => api.post('/contacts/sync', { full: false }),
    onSuccess: () => {
      toast.success('Sync disparado — os contatos atualizam em instantes');
      setTimeout(() => qc.invalidateQueries({ queryKey: ['contacts-counts'] }), 5000);
    },
    onError: () => toast.error('Falha ao disparar sync'),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Contatos</h1>
          <p className="text-sm text-muted-foreground">
            {counts
              ? `${counts.total.toLocaleString('pt-BR')} contatos · ${counts.leads.toLocaleString('pt-BR')} leads · ${counts.buyers.toLocaleString('pt-BR')} compradores`
              : 'Audiência sincronizada da fonte externa'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {counts?.lastSyncedAt && (
            <span className="text-xs text-muted-foreground">
              Último sync: {format(new Date(counts.lastSyncedAt), 'dd/MM HH:mm')}
              {counts.lastRunStatus === 'FAILED' && (
                <span className="ml-1 text-red-700 dark:text-red-400">(falhou)</span>
              )}
            </span>
          )}
          <Button size="sm" variant="outline" onClick={() => syncNow.mutate()} disabled={syncNow.isPending}>
            <RefreshCw className={cn('mr-1.5 size-4', syncNow.isPending && 'animate-spin')} />
            Sincronizar
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmittedSearch(search.trim());
          }}
        >
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar nome, e-mail ou telefone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72 pl-8"
          />
        </form>
        <Select value={kind} onValueChange={(v) => setKind((v as typeof kind) ?? 'ALL')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="LEAD">Leads</SelectItem>
            <SelectItem value="BUYER">Compradores</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Audiência</TableHead>
              <TableHead>Comprou em</TableHead>
              <TableHead>Visto por último</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Nenhum contato encontrado. Rode o sync pra importar da fonte externa.
                </TableCell>
              </TableRow>
            )}
            {items.map((c) => {
              const meta = KIND_META[c.kind];
              return (
                <TableRow key={c.id}>
                  <TableCell className="max-w-48 truncate font-medium" title={c.name ?? undefined}>
                    {c.name ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs">{formatPhone(c.phone)}</TableCell>
                  <TableCell className="max-w-52 truncate text-xs text-muted-foreground" title={c.email ?? undefined}>
                    {c.email ?? '—'}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: meta.color }} />
                      {meta.label}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                    {c.boughtAt ? format(new Date(c.boughtAt), 'dd/MM/yyyy') : '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                    {c.lastSeenAt ? format(new Date(c.lastSeenAt), 'dd/MM/yyyy HH:mm') : '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {items.length === 100 && (
        <p className="text-xs text-muted-foreground">
          Mostrando os primeiros 100. Use a busca pra refinar.
        </p>
      )}
    </div>
  );
}
