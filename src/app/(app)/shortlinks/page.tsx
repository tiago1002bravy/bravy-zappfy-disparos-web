'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Copy, RefreshCw, Check, ChevronsUpDown, Search } from 'lucide-react';

interface Group { id: string; name: string }
interface Shortlink {
  id: string;
  slug: string;
  currentInviteUrl: string | null;
  active: boolean;
  clicks: number;
  lastClickedAt: string | null;
  lastRefreshedAt: string | null;
  notes: string | null;
  group: Group;
}

const PUBLIC_BASE = process.env.NEXT_PUBLIC_PUBLIC_URL ?? 'http://localhost:3011';

function GroupCombobox({
  groups,
  value,
  onChange,
  placeholder = 'Escolha o grupo',
}: {
  groups: Group[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selected = groups.find((g) => g.id === value) ?? null;

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(t));
  }, [groups, q]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
    else setQ('');
  }, [open]);

  return (
    <div className="relative w-full" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm text-left hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
      >
        <span className={selected ? 'truncate' : 'truncate text-muted-foreground'}>
          {selected ? selected.name : placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground ml-2" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar grupo..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul className="max-h-72 overflow-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                Nenhum grupo encontrado.
              </li>
            )}
            {filtered.map((g) => {
              const active = g.id === value;
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(g.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors ${
                      active ? 'bg-muted' : ''
                    }`}
                  >
                    <Check
                      className={`size-4 shrink-0 mt-0.5 ${
                        active ? 'opacity-100 text-brand' : 'opacity-0'
                      }`}
                    />
                    <span className="break-words leading-snug">{g.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ShortlinksPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Shortlink | null>(null);
  const [groupId, setGroupId] = useState('');
  const [slug, setSlug] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [notes, setNotes] = useState('');

  const { data: items = [] } = useQuery<Shortlink[]>({
    queryKey: ['shortlinks'],
    queryFn: async () => (await api.get('/shortlinks')).data,
  });

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: async () => (await api.get('/groups')).data,
  });

  function reset() {
    setEditing(null);
    setGroupId('');
    setSlug('');
    setInviteUrl('');
    setNotes('');
  }

  function startNew() { reset(); setOpen(true); }
  function startEdit(s: Shortlink) {
    setEditing(s);
    setGroupId(s.group.id);
    setSlug(s.slug);
    setInviteUrl(s.currentInviteUrl ?? '');
    setNotes(s.notes ?? '');
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { slug, inviteUrl: inviteUrl || undefined, notes: notes || undefined };
      if (editing) {
        await api.patch(`/shortlinks/${editing.id}`, payload);
      } else {
        await api.post('/shortlinks', { groupId, ...payload });
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Atualizado' : 'Shortlink criado');
      qc.invalidateQueries({ queryKey: ['shortlinks'] });
      setOpen(false); reset();
    },
    onError: (err: unknown) => {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro';
      toast.error(typeof m === 'string' ? m : 'Falha');
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (s: Shortlink) => api.patch(`/shortlinks/${s.id}`, { active: !s.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shortlinks'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/shortlinks/${id}`),
    onSuccess: () => {
      toast.success('Removido');
      qc.invalidateQueries({ queryKey: ['shortlinks'] });
    },
  });

  function copyLink(s: Shortlink) {
    const url = `${PUBLIC_BASE}/g/${s.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Shortlinks</h1>
          <p className="text-sm text-muted-foreground">
            Link fixo do grupo. Quando o invite mudar, atualize aqui — a URL pública continua a mesma.
          </p>
        </div>
        <Button onClick={startNew}>
          <Plus className="size-4 mr-2" />
          Novo shortlink
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slug</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead>URL pública</TableHead>
              <TableHead className="text-right">Cliques</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="w-32 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Nenhum shortlink. Clique em &quot;Novo shortlink&quot;.
                </TableCell>
              </TableRow>
            )}
            {items.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs">{s.slug}</TableCell>
                <TableCell className="max-w-xs truncate">{s.group.name}</TableCell>
                <TableCell className="max-w-[240px] text-xs text-muted-foreground">
                  {s.notes ? (
                    <span className="block truncate" title={s.notes}>{s.notes}</span>
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {PUBLIC_BASE}/g/{s.slug}
                </TableCell>
                <TableCell className="text-right">{s.clicks}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {s.lastRefreshedAt ? new Date(s.lastRefreshedAt).toLocaleString('pt-BR') : '-'}
                </TableCell>
                <TableCell>
                  <Switch checked={s.active} onCheckedChange={() => toggleActive.mutate(s)} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => copyLink(s)} title="Copiar link público">
                      <Copy className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => startEdit(s)} title="Editar invite">
                      <RefreshCw className="size-4" />
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
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar shortlink' : 'Novo shortlink'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editing && (
              <div className="space-y-2">
                <Label>Grupo</Label>
                <GroupCombobox groups={groups} value={groupId} onChange={setGroupId} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Slug (parte final da URL pública)</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">{PUBLIC_BASE}/g/</span>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  placeholder="ex: clientes-vip"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>URL do convite atual do WhatsApp</Label>
              <Input
                value={inviteUrl}
                onChange={(e) => setInviteUrl(e.target.value)}
                placeholder="https://chat.whatsapp.com/XXXXXXXXXX"
              />
              <p className="text-xs text-muted-foreground">
                Quando o admin do grupo revogar/trocar o link, é só vir aqui e colar o novo. Sua URL pública não muda.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="onde esse link é usado"
              />
            </div>
            <Button
              onClick={() => save.mutate()}
              disabled={(!editing && !groupId) || !slug || save.isPending}
              className="w-full"
            >
              {save.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
