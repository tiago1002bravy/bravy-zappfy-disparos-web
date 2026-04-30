'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { RefreshCw, Plus, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface Group {
  id: string;
  instanceName: string;
  remoteId: string;
  name: string;
  description: string | null;
  participantsCount: number | null;
  syncedAt: string;
}

interface Me {
  hasInstanceToken: boolean;
}

export default function GruposPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [openCreate, setOpenCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupParticipants, setNewGroupParticipants] = useState('');

  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: async () => (await api.get('/groups')).data,
  });

  const { data: me } = useQuery<Me>({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/users/me')).data,
  });

  const { data: tenantDefaults } = useQuery<{ defaultParticipants: string[] }>({
    queryKey: ['tenant-defaults'],
    queryFn: async () => (await api.get('/tenant/defaults')).data,
  });

  const sync = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/groups/sync', {});
      return data;
    },
    onSuccess: (data: Group[]) => {
      toast.success(`${data.length} grupo(s) sincronizado(s) da sua instância`);
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (err: unknown) => {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(typeof m === 'string' ? m : 'Falha ao sincronizar');
    },
  });

  const createGroup = useMutation({
    mutationFn: async () => {
      const participants = newGroupParticipants
        .split(/[\s,;]+/)
        .map((p) => p.trim().replace(/\D/g, ''))
        .filter((p) => p.length >= 10 && p.length <= 15);
      const { data } = await api.post('/groups', { name: newGroupName, participants });
      return data;
    },
    onSuccess: () => {
      toast.success('Grupo criado no WhatsApp');
      qc.invalidateQueries({ queryKey: ['groups'] });
      setOpenCreate(false);
      setNewGroupName('');
      setNewGroupParticipants('');
    },
    onError: (err: unknown) => {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(typeof m === 'string' ? m : 'Falha ao criar grupo');
    },
  });

  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()),
  );

  const noConnection = me && !me.hasInstanceToken;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 pb-5 border-b">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Grupos</h1>
          <p className="text-sm text-muted-foreground">
            Cache local dos grupos da sua instância WhatsApp
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpenCreate(true)} disabled={!!noConnection}>
            <Plus className="size-4 mr-2" />
            Criar grupo
          </Button>
          <Button onClick={() => sync.mutate()} disabled={!!noConnection || sync.isPending}>
            <RefreshCw className={`size-4 mr-2 ${sync.isPending ? 'animate-spin' : ''}`} />
            {sync.isPending ? 'Sincronizando…' : 'Sincronizar'}
          </Button>
        </div>
      </div>

      {noConnection && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm text-orange-800 dark:text-orange-300">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-medium">Você ainda não configurou sua conexão WhatsApp.</div>
            <div className="text-xs">
              Sincronizar e criar grupos exigem conexão pessoal. Vai em{' '}
              <Link href="/settings" className="underline font-medium">
                Configurações → Minha conexão
              </Link>{' '}
              pra cadastrar a sua instância.
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-xs text-muted-foreground tabular-nums">
          {filtered.length} de {groups.length}
        </span>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="py-3">Nome</TableHead>
              <TableHead className="py-3">Instância</TableHead>
              <TableHead className="text-right py-3">Participantes</TableHead>
              <TableHead className="py-3">Última sync</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                  Nenhum grupo. Clique em Sincronizar.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((g) => (
              <TableRow key={g.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium py-4">{g.name}</TableCell>
                <TableCell className="py-4 text-muted-foreground text-xs font-mono truncate max-w-[14rem]" title={g.instanceName}>
                  {g.instanceName}
                </TableCell>
                <TableCell className="text-right py-4 tabular-nums">{g.participantsCount ?? '—'}</TableCell>
                <TableCell className="py-4 tabular-nums text-sm">{new Date(g.syncedAt).toLocaleString('pt-BR')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar grupo no WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              O grupo será criado na sua instância pessoal (configurada em Configurações → Minha
              conexão).
            </p>
            <div className="space-y-2">
              <Label>Nome do grupo</Label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="ex: Clientes Premium"
              />
            </div>
            <div className="space-y-2">
              <Label>Participantes (números com DDI, um por linha ou separados por vírgula)</Label>
              <Textarea
                rows={4}
                value={newGroupParticipants}
                onChange={(e) => setNewGroupParticipants(e.target.value)}
                placeholder="5521999999999&#10;5511988887777"
              />
              {(tenantDefaults?.defaultParticipants?.length ?? 0) > 0 ? (
                <div className="rounded-md border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 p-3 space-y-1">
                  <div className="text-xs font-medium text-blue-900 dark:text-blue-200">
                    + {tenantDefaults?.defaultParticipants.length} participante(s) padrão da conta
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300 font-mono">
                    {tenantDefaults?.defaultParticipants.join(', ')}
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    Configurados em Configurações → Participantes, serão mesclados automaticamente.
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-500">
                  Apenas dígitos. DDI + DDD + número. Configure participantes padrão em
                  Configurações pra adicionar automaticamente em todo grupo criado.
                </p>
              )}
            </div>
            <Button
              onClick={() => createGroup.mutate()}
              disabled={!newGroupName || createGroup.isPending}
              className="w-full"
            >
              {createGroup.isPending ? 'Criando...' : 'Criar grupo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
