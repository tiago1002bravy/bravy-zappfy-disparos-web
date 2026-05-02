'use client';
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Copy,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Settings,
  Users as UsersIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Strategy = 'SEQUENTIAL' | 'ROUND_ROBIN' | 'RANDOM';
type CapacitySource = 'UAZAPI' | 'CLICK_COUNT';
type ItemStatus = 'ACTIVE' | 'FULL' | 'INVALID' | 'DISABLED';

interface Group { id: string; name: string; instanceName: string }

interface ShortlinkItem {
  id: string;
  groupId: string;
  group: Group;
  order: number;
  status: ItemStatus;
  currentInviteUrl: string | null;
  lastRefreshedAt: string | null;
  clicks: number;
  lastClickedAt: string | null;
  participantsCount: number | null;
  lastCheckedAt: string | null;
  nextCheckAtClicks: number;
}

interface Shortlink {
  id: string;
  slug: string;
  active: boolean;
  strategy: Strategy;
  hardCap: number;
  initialClickBudget: number;
  capacitySource: CapacitySource;
  autoCreate: boolean;
  autoCreateInstance: string | null;
  autoCreateTemplate: string | null;
  clicks: number;
  lastClickedAt: string | null;
  notes: string | null;
  createdAt: string;
  items: ShortlinkItem[];
}

const PUBLIC_BASE = process.env.NEXT_PUBLIC_PUBLIC_URL ?? 'http://localhost:3015';

const STRATEGY_LABELS: Record<Strategy, string> = {
  SEQUENTIAL: 'Sequencial (enche um, vai pro próximo)',
  ROUND_ROBIN: 'Round-robin (distribui igual)',
  RANDOM: 'Aleatório',
};

const STATUS_META: Record<ItemStatus, { label: string; className: string }> = {
  ACTIVE: { label: 'Ativo', className: 'bg-brand/15 text-brand border border-brand/40' },
  FULL: { label: 'Cheio', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40' },
  INVALID: { label: 'Inválido', className: 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/40' },
  DISABLED: { label: 'Desativado', className: 'bg-muted text-muted-foreground border border-border' },
};

export default function ShortlinksPage() {
  const qc = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: shortlinks = [] } = useQuery<Shortlink[]>({
    queryKey: ['shortlinks'],
    queryFn: async () => (await api.get('/shortlinks')).data,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/shortlinks/${id}`),
    onSuccess: () => {
      toast.success('Shortlink removido');
      qc.invalidateQueries({ queryKey: ['shortlinks'] });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (s: Shortlink) => api.patch(`/shortlinks/${s.id}`, { active: !s.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shortlinks'] }),
  });

  function copyLink(s: Shortlink) {
    const url = `${PUBLIC_BASE}/g/${s.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado');
  }

  const detail = shortlinks.find((s) => s.id === detailId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Shortlinks</h1>
          <p className="text-sm text-muted-foreground">
            Link único que rotaciona entre grupos. Quando lota, vai pro próximo automaticamente.
          </p>
        </div>
        <Button onClick={() => setOpenCreate(true)}>
          <Plus className="size-4 mr-2" />
          Novo shortlink
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slug</TableHead>
              <TableHead>Grupos</TableHead>
              <TableHead>Estratégia</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead>Cliques</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="w-44">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shortlinks.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhum shortlink. Clique em &quot;Novo shortlink&quot;.
                </TableCell>
              </TableRow>
            )}
            {shortlinks.map((s) => {
              const active = s.items.filter((i) => i.status === 'ACTIVE').length;
              const total = s.items.length;
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.slug}</TableCell>
                  <TableCell className="text-xs">
                    <span className={cn('font-semibold', active === 0 && 'text-amber-600')}>
                      {active}
                    </span>
                    <span className="text-muted-foreground">/{total} ativos</span>
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline">{s.strategy}</Badge>
                    {s.autoCreate && <Badge className="ml-1 bg-brand/15 text-brand border-brand/40">auto</Badge>}
                  </TableCell>
                  <TableCell className="max-w-[200px] text-xs text-muted-foreground">
                    {s.notes ? (
                      <span className="block truncate" title={s.notes}>{s.notes}</span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{s.clicks}</TableCell>
                  <TableCell>
                    <Switch checked={s.active} onCheckedChange={() => toggleActive.mutate(s)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => copyLink(s)} title="Copiar link público">
                        <Copy className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDetailId(s.id)} title="Detalhes / configurar">
                        <Settings className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Remover shortlink?')) remove.mutate(s.id);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <CreateShortlinkDialog open={openCreate} onOpenChange={setOpenCreate} />
      <DetailDialog
        shortlink={detail}
        onOpenChange={(o) => !o && setDetailId(null)}
      />
    </div>
  );
}

// ============================================================================
// Create dialog
// ============================================================================

function CreateShortlinkDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [slug, setSlug] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<Strategy>('SEQUENTIAL');
  const [hardCap, setHardCap] = useState(900);
  const [budget, setBudget] = useState(800);
  const [autoCreate, setAutoCreate] = useState(false);
  const [autoCreateInstance, setAutoCreateInstance] = useState('');
  const [autoCreateTemplate, setAutoCreateTemplate] = useState('Grupo {N}');
  const [search, setSearch] = useState('');

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: async () => (await api.get('/groups')).data,
    enabled: open,
  });

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(t));
  }, [groups, search]);

  const instances = useMemo(() => {
    return Array.from(new Set(groups.map((g) => g.instanceName).filter(Boolean)));
  }, [groups]);

  function reset() {
    setSlug('');
    setNotes('');
    setSelectedGroups([]);
    setStrategy('SEQUENTIAL');
    setHardCap(900);
    setBudget(800);
    setAutoCreate(false);
    setAutoCreateInstance('');
    setAutoCreateTemplate('Grupo {N}');
    setSearch('');
  }

  const save = useMutation({
    mutationFn: async () => {
      await api.post('/shortlinks', {
        slug,
        notes: notes || undefined,
        groupIds: selectedGroups,
        strategy,
        hardCap,
        initialClickBudget: budget,
        autoCreate,
        autoCreateInstance: autoCreate ? autoCreateInstance || undefined : undefined,
        autoCreateTemplate: autoCreate ? autoCreateTemplate : undefined,
      });
    },
    onSuccess: () => {
      toast.success('Shortlink criado');
      qc.invalidateQueries({ queryKey: ['shortlinks'] });
      onOpenChange(false);
      reset();
    },
    onError: (err: unknown) => {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(typeof m === 'string' ? m : 'Falha ao criar');
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo shortlink</DialogTitle>
          <DialogDescription>
            Cria um link único que rotaciona entre vários grupos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Slug (parte final da URL)</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">{PUBLIC_BASE}/g/</span>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  placeholder="promo"
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estratégia</Label>
              <Select value={strategy} onValueChange={(v) => setStrategy(v as Strategy)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STRATEGY_LABELS) as Strategy[]).map((k) => (
                    <SelectItem key={k} value={k}>{STRATEGY_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Limite real (hardCap)</Label>
              <Input
                type="number"
                value={hardCap}
                onChange={(e) => setHardCap(Number(e.target.value) || 0)}
                min={10}
                max={1024}
              />
              <p className="text-xs text-muted-foreground">
                Quando atingir, marca grupo como cheio. WhatsApp aceita até 1024 — recomendado 900-950.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Orçamento inicial de cliques</Label>
              <Input
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value) || 0)}
                min={1}
                max={1024}
              />
              <p className="text-xs text-muted-foreground">
                Cliques antes do primeiro recheck via Uazapi. Menor = mais consultas, mais preciso.
              </p>
            </div>
          </div>

          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">Auto-criar grupo quando todos lotarem</Label>
              <Switch checked={autoCreate} onCheckedChange={setAutoCreate} />
            </div>
            {autoCreate && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Instância (instanceName)</Label>
                  <Select value={autoCreateInstance} onValueChange={(v) => setAutoCreateInstance(v ?? '')}>
                    <SelectTrigger><SelectValue placeholder="Escolha..." /></SelectTrigger>
                    <SelectContent>
                      {instances.map((i) => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Template do nome</Label>
                  <Input
                    value={autoCreateTemplate}
                    onChange={(e) => setAutoCreateTemplate(e.target.value)}
                    placeholder="Grupo {N}"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Campanha promo Q4" />
          </div>

          <div className="space-y-2">
            <Label>Grupos ({selectedGroups.length} selecionados)</Label>
            <Input
              placeholder="Buscar grupo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="border rounded max-h-64 overflow-auto divide-y">
              {filtered.map((g) => (
                <label
                  key={g.id}
                  className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selectedGroups.includes(g.id)}
                    onCheckedChange={() =>
                      setSelectedGroups((sel) =>
                        sel.includes(g.id) ? sel.filter((x) => x !== g.id) : [...sel, g.id],
                      )
                    }
                  />
                  <span className="flex-1 text-sm">{g.name}</span>
                  <span className="text-xs text-muted-foreground">{g.instanceName}</span>
                </label>
              ))}
              {filtered.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum grupo encontrado
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={() => save.mutate()}
            disabled={!slug || selectedGroups.length === 0 || save.isPending}
            className="w-full"
          >
            {save.isPending ? 'Criando...' : 'Criar shortlink'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Detail dialog (gestão dos items)
// ============================================================================

function DetailDialog({
  shortlink,
  onOpenChange,
}: {
  shortlink: Shortlink | null;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [openAdd, setOpenAdd] = useState(false);

  const reorder = useMutation({
    mutationFn: async (itemIds: string[]) =>
      api.post(`/shortlinks/${shortlink!.id}/items/reorder`, { itemIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shortlinks'] }),
  });
  const removeItem = useMutation({
    mutationFn: async (itemId: string) =>
      api.delete(`/shortlinks/${shortlink!.id}/items/${itemId}`),
    onSuccess: () => {
      toast.success('Item removido');
      qc.invalidateQueries({ queryKey: ['shortlinks'] });
    },
  });
  const updateItem = useMutation({
    mutationFn: async (vars: { itemId: string; status: ItemStatus }) =>
      api.patch(`/shortlinks/${shortlink!.id}/items/${vars.itemId}`, { status: vars.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shortlinks'] }),
  });
  const refresh = useMutation({
    mutationFn: async (itemId: string) =>
      api.post(`/shortlinks/${shortlink!.id}/items/${itemId}/refresh`),
    onSuccess: () => {
      toast.success('Invite atualizado');
      qc.invalidateQueries({ queryKey: ['shortlinks'] });
    },
    onError: (err: unknown) => {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(typeof m === 'string' ? m : 'Falha');
    },
  });

  function move(itemId: string, dir: -1 | 1) {
    if (!shortlink) return;
    const items = shortlink.items.slice().sort((a, b) => a.order - b.order);
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx === -1) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= items.length) return;
    const reordered = items.slice();
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    reorder.mutate(reordered.map((i) => i.id));
  }

  return (
    <Dialog open={!!shortlink} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[85vh] overflow-y-auto">
        {shortlink && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="font-mono">{shortlink.slug}</span>
                <Badge variant="outline">{shortlink.strategy}</Badge>
                {shortlink.autoCreate && (
                  <Badge className="bg-brand/15 text-brand border-brand/40">auto-create</Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {PUBLIC_BASE}/g/{shortlink.slug} · {shortlink.clicks} cliques totais ·
                cap {shortlink.hardCap} · budget {shortlink.initialClickBudget}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  Grupos ({shortlink.items.length})
                </h3>
                <Button size="sm" variant="outline" onClick={() => setOpenAdd(true)}>
                  <Plus className="size-3.5 mr-1.5" />
                  Adicionar grupos
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Grupo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cliques</TableHead>
                      <TableHead>Membros</TableHead>
                      <TableHead>Próx. check</TableHead>
                      <TableHead className="w-44">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shortlink.items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                          Nenhum grupo. Clique em &quot;Adicionar grupos&quot;.
                        </TableCell>
                      </TableRow>
                    )}
                    {shortlink.items
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((it) => {
                        const meta = STATUS_META[it.status];
                        return (
                          <TableRow key={it.id}>
                            <TableCell className="text-xs text-muted-foreground tabular-nums">
                              {it.order + 1}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div className="font-medium truncate max-w-[200px]">{it.group.name}</div>
                              <div className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                                {it.group.instanceName}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium', meta.className)}>
                                {meta.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs tabular-nums">{it.clicks}</TableCell>
                            <TableCell className="text-xs tabular-nums">
                              {it.participantsCount ?? '—'}
                            </TableCell>
                            <TableCell className="text-xs tabular-nums text-muted-foreground">
                              {it.nextCheckAtClicks}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-center gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                  onClick={() => move(it.id, -1)}
                                  title="Subir"
                                >
                                  <ArrowUp className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                  onClick={() => move(it.id, 1)}
                                  title="Descer"
                                >
                                  <ArrowDown className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                  onClick={() => refresh.mutate(it.id)}
                                  title="Atualizar invite via Uazapi"
                                >
                                  <RefreshCw className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                  onClick={() => updateItem.mutate({
                                    itemId: it.id,
                                    status: it.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
                                  })}
                                  title={it.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
                                >
                                  <UsersIcon className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                  onClick={() => {
                                    if (confirm('Remover esse grupo do shortlink?'))
                                      removeItem.mutate(it.id);
                                  }}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
        {shortlink && (
          <AddItemsDialog
            shortlinkId={shortlink.id}
            existingGroupIds={shortlink.items.map((i) => i.groupId)}
            open={openAdd}
            onOpenChange={setOpenAdd}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddItemsDialog({
  shortlinkId,
  existingGroupIds,
  open,
  onOpenChange,
}: {
  shortlinkId: string;
  existingGroupIds: string[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: async () => (await api.get('/groups')).data,
    enabled: open,
  });

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    const ex = new Set(existingGroupIds);
    return groups
      .filter((g) => !ex.has(g.id))
      .filter((g) => !t || g.name.toLowerCase().includes(t));
  }, [groups, search, existingGroupIds]);

  const add = useMutation({
    mutationFn: async () => api.post(`/shortlinks/${shortlinkId}/items`, { groupIds: selected }),
    onSuccess: () => {
      toast.success('Grupos adicionados');
      qc.invalidateQueries({ queryKey: ['shortlinks'] });
      onOpenChange(false);
      setSelected([]);
      setSearch('');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar grupos</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Buscar grupo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="border rounded max-h-64 overflow-auto divide-y">
            {filtered.map((g) => (
              <label
                key={g.id}
                className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selected.includes(g.id)}
                  onCheckedChange={() =>
                    setSelected((sel) =>
                      sel.includes(g.id) ? sel.filter((x) => x !== g.id) : [...sel, g.id],
                    )
                  }
                />
                <span className="flex-1 text-sm">{g.name}</span>
                <span className="text-xs text-muted-foreground">{g.instanceName}</span>
              </label>
            ))}
            {filtered.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhum grupo disponível
              </div>
            )}
          </div>
          <Button
            onClick={() => add.mutate()}
            disabled={selected.length === 0 || add.isPending}
            className="w-full"
          >
            Adicionar {selected.length} grupo{selected.length === 1 ? '' : 's'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
