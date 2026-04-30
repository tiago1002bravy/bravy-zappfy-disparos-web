'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil } from 'lucide-react';

interface Group { id: string; remoteId: string; name: string; instanceName: string }
interface GroupList {
  id: string;
  name: string;
  color: string | null;
  memberships: { group: Group }[];
  _count: { memberships: number };
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function GroupListsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GroupList | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[5]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const { data: lists = [] } = useQuery<GroupList[]>({
    queryKey: ['group-lists'],
    queryFn: async () => (await api.get('/group-lists')).data,
  });

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: async () => (await api.get('/groups')).data,
  });

  function reset() {
    setEditing(null);
    setName('');
    setColor(COLORS[5]);
    setSelected([]);
    setSearch('');
  }

  function startNew() {
    reset();
    setOpen(true);
  }

  function startEdit(l: GroupList) {
    setEditing(l);
    setName(l.name);
    setColor(l.color ?? COLORS[5]);
    setSelected(l.memberships.map((m) => m.group.id));
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name, color, groupIds: selected };
      if (editing) await api.patch(`/group-lists/${editing.id}`, payload);
      else await api.post('/group-lists', payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Lista atualizada' : 'Lista criada');
      qc.invalidateQueries({ queryKey: ['group-lists'] });
      setOpen(false);
      reset();
    },
    onError: () => toast.error('Falha ao salvar'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/group-lists/${id}`),
    onSuccess: () => {
      toast.success('Lista removida');
      qc.invalidateQueries({ queryKey: ['group-lists'] });
    },
  });

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const filtered = groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 pb-5 border-b">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Listas de grupos</h1>
          <p className="text-sm text-muted-foreground">Agrupe grupos pra disparar pra todos de uma vez</p>
        </div>
        <Button onClick={startNew}>
          <Plus className="size-4 mr-2" />
          Nova lista
        </Button>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="py-3">Nome</TableHead>
              <TableHead className="text-right py-3">Grupos</TableHead>
              <TableHead className="w-32 text-right py-3 pr-4">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lists.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-10">
                  Nenhuma lista. Clique em &quot;Nova lista&quot; pra começar.
                </TableCell>
              </TableRow>
            )}
            {lists.map((l) => (
              <TableRow key={l.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="py-4">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="size-3 rounded-full ring-1 ring-border shrink-0"
                      style={{ background: l.color ?? '#ccc' }}
                    />
                    <span className="font-medium">{l.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right py-4">
                  <Badge variant="secondary">{l._count.memberships}</Badge>
                </TableCell>
                <TableCell className="text-right py-3 pr-3">
                  <div className="flex items-center justify-end gap-2">
                    <div className="flex items-center gap-0.5 rounded-md border border-zinc-300 dark:border-zinc-600 bg-background/50">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => startEdit(l)}
                        title="Editar"
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm('Remover lista?')) remove.mutate(l.id);
                      }}
                      title="Excluir"
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar lista' : 'Nova lista'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Clientes premium" />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`size-8 rounded-full border-2 ${color === c ? 'border-zinc-900 dark:border-zinc-100' : 'border-transparent'}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Grupos ({selected.length} selecionados)</Label>
              <Input
                placeholder="Buscar grupo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="border rounded max-h-64 overflow-auto divide-y">
                {filtered.map((g) => (
                  <label key={g.id} className="flex items-center gap-2 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer">
                    <Checkbox checked={selected.includes(g.id)} onCheckedChange={() => toggle(g.id)} />
                    <span className="flex-1 text-sm">{g.name}</span>
                    <span className="text-xs text-zinc-500">{g.instanceName}</span>
                  </label>
                ))}
                {filtered.length === 0 && (
                  <div className="p-4 text-center text-sm text-zinc-500">Nenhum grupo encontrado</div>
                )}
              </div>
            </div>
            <Button onClick={() => save.mutate()} disabled={!name || save.isPending} className="w-full">
              {save.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
