'use client';
import { useMemo, useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { RefreshCw, Plus, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
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

interface TenantDefaults {
  defaultParticipants: string[];
  defaultGroupAdmins: string[];
  defaultGroupDescription: string | null;
  defaultGroupPictureMediaId: string | null;
  defaultGroupLocked: boolean;
  defaultGroupAnnounce: boolean;
}

interface BulkCreateResp {
  created: Array<{ id: string; remoteId: string; name: string; n: number }>;
  failures: Array<{ n: number; error: string }>;
  groupListId?: string;
  shortlinkId?: string;
}

export default function GruposPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const [openCreate, setOpenCreate] = useState(false);
  const [nameTemplate, setNameTemplate] = useState('🎁 Meu grupo #{N}');
  const [startNumber, setStartNumber] = useState(1);
  const [count, setCount] = useState(1);
  const [createList, setCreateList] = useState(false);
  const [listName, setListName] = useState('');
  const [createShortlink, setCreateShortlink] = useState(false);
  const [shortlinkSlug, setShortlinkSlug] = useState('');

  const [report, setReport] = useState<BulkCreateResp | null>(null);

  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: async () => (await api.get('/groups')).data,
  });

  const { data: me } = useQuery<Me>({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/users/me')).data,
  });

  const { data: tenantDefaults } = useQuery<TenantDefaults>({
    queryKey: ['tenant-defaults'],
    queryFn: async () => (await api.get('/tenant/defaults')).data,
  });

  const sync = useMutation({
    mutationFn: async () => (await api.post('/groups/sync', {})).data as Group[],
    onSuccess: (data) => {
      toast.success(`${data.length} grupo(s) sincronizado(s)`);
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (err: unknown) => {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(typeof m === 'string' ? m : 'Falha ao sincronizar');
    },
  });

  const bulkCreate = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        nameTemplate,
        startNumber,
        count,
      };
      if (createList && listName.trim()) {
        body.alsoCreateList = { name: listName.trim() };
      }
      if (createShortlink && shortlinkSlug.trim()) {
        body.alsoCreateShortlink = { slug: shortlinkSlug.trim() };
      }
      const { data } = await api.post('/groups/bulk-create', body);
      return data as BulkCreateResp;
    },
    onSuccess: (data) => {
      setReport(data);
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['group-lists'] });
      qc.invalidateQueries({ queryKey: ['shortlinks'] });
      const ok = data.created.length;
      const fail = data.failures.length;
      if (fail === 0) toast.success(`${ok} grupo(s) criado(s)`);
      else toast.warning(`${ok} criado(s), ${fail} falha(s)`);
    },
    onError: (err: unknown) => {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(typeof m === 'string' ? m : 'Falha no bulk-create');
    },
  });

  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()),
  );

  const noConnection = me && !me.hasInstanceToken;

  const previewNames = useMemo(() => {
    if (!nameTemplate.includes('{N}')) return [];
    const list: string[] = [];
    for (let i = 0; i < Math.min(count, 5); i++) {
      list.push(nameTemplate.replace('{N}', String(startNumber + i)));
    }
    if (count > 5) list.push(`… +${count - 5} mais`);
    return list;
  }, [nameTemplate, startNumber, count]);

  const validTemplate = nameTemplate.includes('{N}');
  const validList = !createList || listName.trim().length >= 2;
  const validShortlink = !createShortlink || /^[a-z0-9-]{2,}$/.test(shortlinkSlug.trim());
  const canSubmit =
    validTemplate &&
    count >= 1 &&
    count <= 50 &&
    startNumber >= 0 &&
    validList &&
    validShortlink &&
    !bulkCreate.isPending;

  const closeAndReset = () => {
    setOpenCreate(false);
    setReport(null);
  };

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
            Criar grupo(s)
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
              <TableHead className="py-3">Participantes</TableHead>
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
                <TableCell className="py-4 tabular-nums">{g.participantsCount ?? '—'}</TableCell>
                <TableCell className="py-4 tabular-nums text-sm">{new Date(g.syncedAt).toLocaleString('pt-BR')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={openCreate} onOpenChange={(o) => { if (!o) closeAndReset(); else setOpenCreate(o); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar grupo(s) no WhatsApp</DialogTitle>
          </DialogHeader>

          {report ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span><b>{report.created.length}</b> grupo(s) criado(s)</span>
                {report.failures.length > 0 && (
                  <>
                    <span>·</span>
                    <XCircle className="size-4 text-red-500" />
                    <span><b>{report.failures.length}</b> falha(s)</span>
                  </>
                )}
              </div>
              {report.created.length > 0 && (
                <div className="rounded-md border bg-muted/30 p-3 space-y-1 max-h-48 overflow-auto">
                  {report.created.map((c) => (
                    <div key={c.id} className="text-xs font-mono">{c.name}</div>
                  ))}
                </div>
              )}
              {report.failures.length > 0 && (
                <div className="rounded-md border border-red-500/40 bg-red-500/5 p-3 space-y-1 max-h-32 overflow-auto">
                  {report.failures.map((f, i) => (
                    <div key={i} className="text-xs"><b>#{f.n}</b>: {f.error}</div>
                  ))}
                </div>
              )}
              {report.groupListId && (
                <div className="text-xs text-muted-foreground">
                  Lista de grupos criada: <code>{report.groupListId}</code>
                </div>
              )}
              {report.shortlinkId && (
                <div className="text-xs text-muted-foreground">
                  Shortlink criado: <code>{report.shortlinkId}</code>
                </div>
              )}
              <Button onClick={closeAndReset} className="w-full">Fechar</Button>
            </div>
          ) : (
            <div className="space-y-5">
              {tenantDefaults && (
                <div className="rounded-md border bg-brand-soft border-brand/30 p-3 text-xs space-y-1">
                  <div className="font-medium">Defaults aplicados em cada grupo criado:</div>
                  <ul className="list-disc list-inside text-foreground/80 space-y-0.5">
                    <li>{tenantDefaults.defaultGroupAdmins.length} admin(s) padrão</li>
                    <li>Descrição: {tenantDefaults.defaultGroupDescription ? '✓' : '— vazia —'}</li>
                    <li>Foto: {tenantDefaults.defaultGroupPictureMediaId ? '✓' : '— sem foto —'}</li>
                    <li>Locked: {tenantDefaults.defaultGroupLocked ? 'sim (só adm edita)' : 'não'}</li>
                    <li>Announce: {tenantDefaults.defaultGroupAnnounce ? 'sim (só adm envia)' : 'não'}</li>
                  </ul>
                  <div className="text-muted-foreground">
                    Edite em <Link href="/settings" className="underline">Configurações</Link>.
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Nome do grupo (template)</Label>
                <Input
                  value={nameTemplate}
                  onChange={(e) => setNameTemplate(e.target.value)}
                  placeholder="🎁 Meu grupo #{N}"
                />
                <p className="text-xs text-muted-foreground">
                  Use <code>{'{N}'}</code> pra inserir o número. Ex: <code>{'Aulão #{N}'}</code> →{' '}
                  <code>Aulão #1</code>, <code>Aulão #2</code>...
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Número inicial</Label>
                  <Input
                    type="number"
                    min={0}
                    value={startNumber}
                    onChange={(e) => setStartNumber(Number(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantidade de grupos</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value) || 1)}
                  />
                </div>
              </div>

              {previewNames.length > 0 && validTemplate && (
                <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                  <div className="text-xs font-medium">Preview:</div>
                  {previewNames.map((n, i) => (
                    <div key={i} className="text-xs font-mono">{n}</div>
                  ))}
                </div>
              )}
              {!validTemplate && nameTemplate.length > 0 && (
                <div className="text-xs text-red-500">
                  Template precisa conter <code>{'{N}'}</code>.
                </div>
              )}

              <div className="rounded-md border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Criar lista de grupos</div>
                    <div className="text-xs text-muted-foreground">
                      Junta todos os grupos criados em uma segmentação
                    </div>
                  </div>
                  <Switch checked={createList} onCheckedChange={setCreateList} />
                </div>
                {createList && (
                  <Input
                    placeholder="Nome da lista (ex: Aulão Meta 02/05)"
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                  />
                )}
              </div>

              <div className="rounded-md border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Criar shortlink</div>
                    <div className="text-xs text-muted-foreground">
                      Link público que rotaciona entre os grupos do pool
                    </div>
                  </div>
                  <Switch checked={createShortlink} onCheckedChange={setCreateShortlink} />
                </div>
                {createShortlink && (
                  <div className="space-y-1">
                    <Input
                      placeholder="slug-do-link"
                      value={shortlinkSlug}
                      onChange={(e) => setShortlinkSlug(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      a-z, 0-9 e hífen. URL final: <code>/g/{shortlinkSlug || 'slug'}</code>
                    </p>
                  </div>
                )}
              </div>

              <Button
                onClick={() => bulkCreate.mutate()}
                disabled={!canSubmit}
                className="w-full"
              >
                {bulkCreate.isPending ? `Criando ${count} grupo(s)...` : `Criar ${count} grupo(s)`}
              </Button>
              {count > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  Pode levar alguns minutos — usamos delay anti-ban entre criações.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
