'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, resolveMediaUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import { InstanceCredentialsField, type InstanceCreds } from '@/components/instance-credentials-field';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

interface Group {
  remoteId: string;
  name: string;
  instanceName: string;
}

interface Media {
  id: string;
  url: string;
  thumbUrl: string | null;
  mime: string;
}

interface GUS {
  id: string;
  groupRemoteId: string;
  target: 'NAME' | 'DESCRIPTION' | 'PICTURE';
  newName: string | null;
  newDescription: string | null;
  type: string;
  startAt: string;
  status: string;
}

export default function GroupUpdatesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [creds, setCreds] = useState<InstanceCreds>({ instanceName: '', instanceToken: '' });
  const [groupRemoteId, setGroupRemoteId] = useState('');
  const [target, setTarget] = useState<'NAME' | 'DESCRIPTION' | 'PICTURE'>('NAME');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPictureMediaId, setNewPictureMediaId] = useState('');
  const [type, setType] = useState<'ONCE' | 'DAILY' | 'WEEKLY' | 'CUSTOM_CRON'>('ONCE');
  const [startAt, setStartAt] = useState('');
  const [time, setTime] = useState('09:00');
  const [cron, setCron] = useState('0 9 * * *');

  const { data = [] } = useQuery<GUS[]>({
    queryKey: ['group-updates'],
    queryFn: async () => (await api.get('/group-update-schedules')).data,
  });

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: async () => (await api.get('/groups')).data,
  });

  const { data: medias = [] } = useQuery<Media[]>({
    queryKey: ['media'],
    queryFn: async () => (await api.get('/media')).data,
    enabled: target === 'PICTURE',
  });

  const submit = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        groupRemoteId,
        target,
        type,
        startAt: startAt ? new Date(startAt).toISOString() : new Date().toISOString(),
      };
      if (!creds.useAccountDefault) {
        payload.instanceName = creds.instanceName;
        payload.instanceToken = creds.instanceToken;
      }
      if (target === 'NAME') payload.newName = newName;
      if (target === 'DESCRIPTION') payload.newDescription = newDescription;
      if (target === 'PICTURE') payload.newPictureMediaId = newPictureMediaId;
      if (type === 'DAILY' || type === 'WEEKLY') payload.time = time;
      if (type === 'CUSTOM_CRON') payload.cron = cron;
      await api.post('/group-update-schedules', payload);
    },
    onSuccess: () => {
      toast.success('Atualização agendada');
      qc.invalidateQueries({ queryKey: ['group-updates'] });
      setOpen(false);
    },
    onError: () => toast.error('Falha ao agendar'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/group-update-schedules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group-updates'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 pb-5 border-b">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Atualizar grupos</h1>
          <p className="text-sm text-muted-foreground">Agendar troca de nome, descrição ou foto</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4 mr-2" />
          Nova atualização
        </Button>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="py-3">Grupo</TableHead>
              <TableHead className="py-3">Alvo</TableHead>
              <TableHead className="py-3">Novo valor</TableHead>
              <TableHead className="py-3">Tipo</TableHead>
              <TableHead className="py-3">Início</TableHead>
              <TableHead className="py-3">Status</TableHead>
              <TableHead className="w-20 text-right py-3 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  Nenhuma atualização agendada.
                </TableCell>
              </TableRow>
            )}
            {data.map((g) => (
              <TableRow key={g.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-mono text-xs align-top py-4 text-muted-foreground">{g.groupRemoteId}</TableCell>
                <TableCell className="align-top py-4">
                  <Badge variant="outline" className="text-[10px] tracking-wide">{g.target}</Badge>
                </TableCell>
                <TableCell className="align-top py-4">
                  <div className="line-clamp-2 max-w-md whitespace-pre-wrap text-sm" title={g.newName ?? g.newDescription ?? ''}>
                    {g.newName ?? g.newDescription ?? <span className="text-muted-foreground/60 italic">(foto)</span>}
                  </div>
                </TableCell>
                <TableCell className="align-top py-4">
                  <Badge variant="outline" className="text-[10px] tracking-wide">{g.type}</Badge>
                </TableCell>
                <TableCell className="align-top py-4 tabular-nums text-sm">{new Date(g.startAt).toLocaleString('pt-BR')}</TableCell>
                <TableCell className="align-top py-4">
                  <Badge variant="secondary">{g.status}</Badge>
                </TableCell>
                <TableCell className="text-right align-top py-3 pr-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => remove.mutate(g.id)}
                    title="Excluir"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Nova atualização agendada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <InstanceCredentialsField value={creds} onChange={setCreds} />

            <div className="space-y-2">
              <Label>Grupo</Label>
              <Select value={groupRemoteId} onValueChange={(v) => setGroupRemoteId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha o grupo" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.remoteId} value={g.remoteId}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>O que trocar</Label>
              <Select value={target} onValueChange={(v) => v && setTarget(v as typeof target)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NAME">Nome</SelectItem>
                  <SelectItem value="DESCRIPTION">Descrição</SelectItem>
                  <SelectItem value="PICTURE">Foto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {target === 'NAME' && (
              <div className="space-y-2">
                <Label>Novo nome</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
            )}
            {target === 'DESCRIPTION' && (
              <div className="space-y-2">
                <Label>Nova descrição</Label>
                <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
              </div>
            )}
            {target === 'PICTURE' && (
              <div className="space-y-2">
                <Label>Nova foto (mídia)</Label>
                <div className="grid grid-cols-4 gap-2 max-h-32 overflow-auto">
                  {medias.filter((m) => m.mime.startsWith('image/')).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setNewPictureMediaId(m.id)}
                      className={`rounded border-2 ${newPictureMediaId === m.id ? 'border-blue-500' : 'border-transparent'}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={resolveMediaUrl(m.thumbUrl ?? m.url)} alt="" className="w-full h-16 object-cover rounded" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Quando</Label>
              <Select value={type} onValueChange={(v) => v && setType(v as typeof type)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONCE">Uma vez</SelectItem>
                  <SelectItem value="DAILY">Diária</SelectItem>
                  <SelectItem value="WEEKLY">Semanal</SelectItem>
                  <SelectItem value="CUSTOM_CRON">Cron customizado</SelectItem>
                </SelectContent>
              </Select>
              {type === 'ONCE' && (
                <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              )}
              {(type === 'DAILY' || type === 'WEEKLY') && (
                <>
                  <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </>
              )}
              {type === 'CUSTOM_CRON' && (
                <>
                  <Input value={cron} onChange={(e) => setCron(e.target.value)} placeholder="cron" />
                  <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                </>
              )}
            </div>

            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
              {submit.isPending ? 'Agendando...' : 'Agendar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
