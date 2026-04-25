'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Copy, RefreshCw } from 'lucide-react';

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
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Shortlinks</h1>
          <p className="text-sm text-zinc-500">
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
                <TableCell colSpan={7} className="text-center text-zinc-500">
                  Nenhum shortlink. Clique em &quot;Novo shortlink&quot;.
                </TableCell>
              </TableRow>
            )}
            {items.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs">{s.slug}</TableCell>
                <TableCell className="max-w-xs truncate">{s.group.name}</TableCell>
                <TableCell className="font-mono text-xs text-zinc-600">
                  {PUBLIC_BASE}/g/{s.slug}
                </TableCell>
                <TableCell className="text-right">{s.clicks}</TableCell>
                <TableCell className="text-xs text-zinc-500">
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
                <Select value={groupId} onValueChange={(v) => setGroupId(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha o grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Slug (parte final da URL pública)</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 font-mono">{PUBLIC_BASE}/g/</span>
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
              <p className="text-xs text-zinc-500">
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
