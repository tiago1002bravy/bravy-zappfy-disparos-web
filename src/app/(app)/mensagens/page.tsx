'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRef } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Send, ImageIcon, Video, Mic, Paperclip, X, Music, CalendarClock, CalendarX, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { InstanceCredentialsField, type InstanceCreds } from '@/components/instance-credentials-field';
import { Checkbox } from '@/components/ui/checkbox';

type MediaKind = 'AUTO' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PTT' | 'DOCUMENT';

interface Media {
  id: string;
  url: string;
  thumbUrl: string | null;
  mime: string;
  s3Key: string;
}

interface Attachment {
  mediaId: string;
  kind: MediaKind;
  media: Media;
}

interface ScheduleSummary {
  id: string;
  type: 'ONCE' | 'DAILY' | 'WEEKLY' | 'CUSTOM_CRON';
  status: 'ACTIVE' | 'PAUSED';
  startAt: string;
  cron: string | null;
}

interface Message {
  id: string;
  name: string;
  text: string | null;
  mentionAll: boolean;
  createdAt: string;
  medias: { id: string; order: number; kind: MediaKind; media: Media; url: string; thumbUrl: string | null }[];
  schedules: ScheduleSummary[];
}

interface Group { id: string; remoteId: string; name: string; instanceName: string }
interface GroupList { id: string; name: string; color: string | null; _count: { memberships: number } }

export default function MensagensPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Message | null>(null);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [mentionAll, setMentionAll] = useState(true);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState<MediaKind | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingKindRef = useRef<MediaKind>('AUTO');

  const [openSend, setOpenSend] = useState(false);
  const [sendMsg, setSendMsg] = useState<Message | null>(null);
  const [creds, setCreds] = useState<InstanceCreds>({ instanceName: '', instanceToken: '' });
  const [sendGroups, setSendGroups] = useState<string[]>([]);
  const [sendLists, setSendLists] = useState<string[]>([]);

  const [openSchedule, setOpenSchedule] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState<Message | null>(null);
  const [scheduleType, setScheduleType] = useState<'ONCE' | 'DAILY' | 'WEEKLY' | 'CUSTOM_CRON'>('ONCE');
  const [scheduleStartAt, setScheduleStartAt] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleWeekdays, setScheduleWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [scheduleCron, setScheduleCron] = useState('0 9 * * *');

  const [openCancelSched, setOpenCancelSched] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<Message | null>(null);
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: async () => (await api.get('/groups')).data,
    enabled: openSend || openSchedule,
  });

  const { data: groupLists = [] } = useQuery<GroupList[]>({
    queryKey: ['group-lists'],
    queryFn: async () => (await api.get('/group-lists')).data,
    enabled: openSend || openSchedule,
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['messages'],
    queryFn: async () => (await api.get('/messages')).data,
  });

  function reset() {
    setEditing(null);
    setName('');
    setText('');
    setMentionAll(true);
    setAttachments([]);
  }

  function startNew() {
    reset();
    setOpen(true);
  }

  function startEdit(m: Message) {
    setEditing(m);
    setName(m.name);
    setText(m.text ?? '');
    setMentionAll(m.mentionAll);
    setAttachments(
      m.medias
        .sort((a, b) => a.order - b.order)
        .map((mm) => ({ mediaId: mm.media.id, kind: mm.kind, media: mm.media })),
    );
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        text: text || undefined,
        mentionAll,
        medias: attachments.map((a, order) => ({ mediaId: a.mediaId, order, kind: a.kind })),
      };
      if (editing) await api.patch(`/messages/${editing.id}`, payload);
      else await api.post('/messages', payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Mensagem atualizada' : 'Mensagem criada');
      qc.invalidateQueries({ queryKey: ['messages'] });
      setOpen(false);
      reset();
    },
    onError: () => toast.error('Falha ao salvar'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/messages/${id}`),
    onSuccess: () => {
      toast.success('Mensagem removida');
      qc.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  const sendNow = useMutation({
    mutationFn: async () => {
      if (!sendMsg) return;
      const payload: Record<string, unknown> = { groupRemoteIds: sendGroups, groupListIds: sendLists };
      if (!creds.useAccountDefault) {
        payload.instanceName = creds.instanceName;
        payload.instanceToken = creds.instanceToken;
      }
      await api.post(`/messages/${sendMsg.id}/send-now`, payload);
    },
    onSuccess: () => {
      toast.success('Disparo iniciado — em segundos chega no(s) grupo(s)');
      setOpenSend(false);
      setSendGroups([]);
      setSendLists([]);
      qc.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: () => toast.error('Falha ao disparar'),
  });

  const schedule = useMutation({
    mutationFn: async () => {
      if (!scheduleMsg) return;
      const payload: Record<string, unknown> = {
        messageId: scheduleMsg.id,
        groupRemoteIds: sendGroups,
        groupListIds: sendLists,
        type: scheduleType,
        startAt: scheduleStartAt ? new Date(scheduleStartAt).toISOString() : new Date().toISOString(),
      };
      if (!creds.useAccountDefault) {
        payload.instanceName = creds.instanceName;
        payload.instanceToken = creds.instanceToken;
      }
      if (scheduleType === 'DAILY' || scheduleType === 'WEEKLY') payload.time = scheduleTime;
      if (scheduleType === 'WEEKLY') payload.weekdays = scheduleWeekdays;
      if (scheduleType === 'CUSTOM_CRON') payload.cron = scheduleCron;
      await api.post('/schedules', payload);
    },
    onSuccess: () => {
      toast.success('Agendamento criado');
      setOpenSchedule(false);
      setSendGroups([]);
      setSendLists([]);
      qc.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (err: unknown) => {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(typeof m === 'string' ? m : 'Falha ao agendar');
    },
  });

  const cancelSchedule = useMutation({
    mutationFn: async (scheduleId: string) => api.patch(`/schedules/${scheduleId}`, { action: 'cancel' }),
    onSuccess: () => {
      toast.success('Agendamento cancelado');
      qc.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  function startSend(m: Message) {
    setSendMsg(m);
    setSendGroups([]);
    setSendLists([]);
    setOpenSend(true);
  }
  function startSchedule(m: Message) {
    setScheduleMsg(m);
    setSendGroups([]);
    setSendLists([]);
    setScheduleType('ONCE');
    setScheduleStartAt('');
    setOpenSchedule(true);
  }
  function startCancelSchedules(m: Message) {
    setCancelMsg(m);
    setOpenCancelSched(true);
  }
  function toggleSendGroup(id: string) {
    setSendGroups((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }
  function toggleSendList(id: string) {
    setSendLists((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }
  function toggleScheduleWeekday(d: number) {
    setScheduleWeekdays((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort()));
  }

  const ACCEPT_BY_KIND: Record<MediaKind, string> = {
    AUTO: '*/*',
    IMAGE: 'image/*',
    VIDEO: 'video/*',
    AUDIO: 'audio/*',
    PTT: 'audio/*',
    DOCUMENT: '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,application/*',
  };

  async function pickAndUpload(kind: MediaKind) {
    pendingKindRef.current = kind;
    if (!fileInputRef.current) return;
    fileInputRef.current.accept = ACCEPT_BY_KIND[kind];
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  }

  async function handleFile(file: File) {
    const kind = pendingKindRef.current;
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post<Media>('/media', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAttachments((prev) => [...prev, { mediaId: data.id, kind, media: data }]);
      qc.invalidateQueries({ queryKey: ['media'] });
      toast.success('Anexo adicionado');
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(typeof m === 'string' ? m : 'Falha no upload');
    } finally {
      setUploading(null);
    }
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveAttachment(idx: number, dir: -1 | 1) {
    setAttachments((prev) => {
      const next = [...prev];
      const t = idx + dir;
      if (t < 0 || t >= next.length) return prev;
      [next[idx], next[t]] = [next[t], next[idx]];
      return next;
    });
  }

  const KIND_LABEL: Record<MediaKind, string> = {
    AUTO: 'Anexo',
    IMAGE: 'Imagem',
    VIDEO: 'Vídeo',
    AUDIO: 'Áudio',
    PTT: 'Áudio (gravado)',
    DOCUMENT: 'Documento',
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mensagens</h1>
          <p className="text-sm text-zinc-500">Templates reutilizáveis para agendamentos</p>
        </div>
        <Button onClick={startNew}>
          <Plus className="size-4 mr-2" />
          Nova mensagem
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Preview</TableHead>
              <TableHead className="text-right">Mídias</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right w-48">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-zinc-500">
                  Nenhuma mensagem ainda.
                </TableCell>
              </TableRow>
            )}
            {messages.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell className="text-zinc-600 align-top">
                  <div
                    className="line-clamp-3 max-w-xl whitespace-pre-wrap text-sm leading-relaxed"
                    title={m.text ?? ''}
                  >
                    {m.text || <span className="text-zinc-400 italic">— sem texto —</span>}
                  </div>
                </TableCell>
                <TableCell className="text-right">{m.medias.length}</TableCell>
                <TableCell>
                  {m.schedules.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {m.schedules.length} ag.
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); startEdit(m); }}
                      title="Editar mensagem"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); startSend(m); }}
                      title="Disparar agora"
                    >
                      <Send className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); startSchedule(m); }}
                      title="Agendar disparo"
                    >
                      <CalendarClock className="size-4" />
                    </Button>
                    {m.schedules.length > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); startCancelSchedules(m); }}
                        title="Cancelar agendamentos"
                        className="text-orange-600"
                      >
                        <CalendarX className="size-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Remover mensagem?')) remove.mutate(m.id);
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

      <Dialog open={openSend} onOpenChange={setOpenSend}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Disparar agora: {sendMsg?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <InstanceCredentialsField value={creds} onChange={setCreds} />
            {groupLists.length > 0 && (
              <div>
                <Label className="mb-2 block">Listas ({sendLists.length} selecionadas)</Label>
                <div className="flex flex-wrap gap-2">
                  {groupLists.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => toggleSendList(l.id)}
                      className={`px-3 py-1 rounded-full text-xs border-2 flex items-center gap-2 ${sendLists.includes(l.id) ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-zinc-200 dark:border-zinc-700'}`}
                    >
                      <span className="size-2 rounded-full" style={{ background: l.color ?? '#ccc' }} />
                      {l.name} <span className="text-zinc-500">({l._count.memberships})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label className="mb-2 block">Grupos individuais ({sendGroups.length} selecionados)</Label>
              <div className="border rounded max-h-48 overflow-auto divide-y">
                {groups.map((g) => (
                  <label key={g.id} className="flex items-center gap-2 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer">
                    <Checkbox
                      checked={sendGroups.includes(g.remoteId)}
                      onCheckedChange={() => toggleSendGroup(g.remoteId)}
                    />
                    <span className="flex-1 text-sm">{g.name}</span>
                    <span className="text-xs text-zinc-500">{g.instanceName}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button
              onClick={() => sendNow.mutate()}
              disabled={
                (!creds.useAccountDefault && (!creds.instanceName || !creds.instanceToken)) ||
                (sendGroups.length === 0 && sendLists.length === 0) ||
                sendNow.isPending
              }
              className="w-full"
            >
              <Send className="size-4 mr-2" />
              {sendNow.isPending ? 'Disparando...' : `Disparar para ${sendGroups.length + sendLists.length} alvo(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openSchedule} onOpenChange={setOpenSchedule}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agendar disparo: {scheduleMsg?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <InstanceCredentialsField value={creds} onChange={setCreds} />

            {groupLists.length > 0 && (
              <div>
                <Label className="mb-2 block">Listas ({sendLists.length} selecionadas)</Label>
                <div className="flex flex-wrap gap-2">
                  {groupLists.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => toggleSendList(l.id)}
                      className={`px-3 py-1 rounded-full text-xs border-2 flex items-center gap-2 ${sendLists.includes(l.id) ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-zinc-200 dark:border-zinc-700'}`}
                    >
                      <span className="size-2 rounded-full" style={{ background: l.color ?? '#ccc' }} />
                      {l.name} <span className="text-zinc-500">({l._count.memberships})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label className="mb-2 block">Grupos individuais ({sendGroups.length})</Label>
              <div className="border rounded max-h-32 overflow-auto divide-y">
                {groups.map((g) => (
                  <label key={g.id} className="flex items-center gap-2 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer">
                    <Checkbox checked={sendGroups.includes(g.remoteId)} onCheckedChange={() => toggleSendGroup(g.remoteId)} />
                    <span className="flex-1 text-sm">{g.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="flex gap-2">
                {(['ONCE', 'DAILY', 'WEEKLY', 'CUSTOM_CRON'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setScheduleType(t)}
                    className={`px-3 py-1 rounded text-xs border-2 ${scheduleType === t ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-zinc-200 dark:border-zinc-700'}`}
                  >
                    {t === 'ONCE' ? 'Uma vez' : t === 'DAILY' ? 'Diária' : t === 'WEEKLY' ? 'Semanal' : 'Cron'}
                  </button>
                ))}
              </div>
            </div>

            {scheduleType === 'ONCE' && (
              <div className="space-y-2">
                <Label>Data e hora</Label>
                <Input type="datetime-local" value={scheduleStartAt} onChange={(e) => setScheduleStartAt(e.target.value)} />
              </div>
            )}
            {(scheduleType === 'DAILY' || scheduleType === 'WEEKLY') && (
              <>
                <div className="space-y-2">
                  <Label>Início (a partir de)</Label>
                  <Input type="datetime-local" value={scheduleStartAt} onChange={(e) => setScheduleStartAt(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
                </div>
              </>
            )}
            {scheduleType === 'WEEKLY' && (
              <div className="space-y-2">
                <Label>Dias da semana</Label>
                <div className="flex gap-1">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((label, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleScheduleWeekday(idx)}
                      className={`px-3 py-1 rounded text-xs border ${scheduleWeekdays.includes(idx) ? 'bg-blue-500 text-white border-blue-500' : ''}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {scheduleType === 'CUSTOM_CRON' && (
              <>
                <div className="space-y-2">
                  <Label>Cron expression</Label>
                  <Input value={scheduleCron} onChange={(e) => setScheduleCron(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Início</Label>
                  <Input type="datetime-local" value={scheduleStartAt} onChange={(e) => setScheduleStartAt(e.target.value)} />
                </div>
              </>
            )}

            <Button
              onClick={() => schedule.mutate()}
              disabled={
                (!creds.useAccountDefault && (!creds.instanceName || !creds.instanceToken)) ||
                (sendGroups.length === 0 && sendLists.length === 0) ||
                schedule.isPending
              }
              className="w-full"
            >
              <CalendarClock className="size-4 mr-2" />
              {schedule.isPending ? 'Agendando...' : 'Agendar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openCancelSched} onOpenChange={setOpenCancelSched}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendamentos ativos: {cancelMsg?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {cancelMsg?.schedules.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded border">
                <div className="text-sm">
                  <div className="font-medium">{s.type}</div>
                  <div className="text-xs text-zinc-500">
                    {s.cron ?? new Date(s.startAt).toLocaleString('pt-BR')} · {s.status}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  onClick={() => cancelSchedule.mutate(s.id)}
                >
                  <CalendarX className="size-4 mr-1.5" />
                  Cancelar
                </Button>
              </div>
            ))}
            {cancelMsg && cancelMsg.schedules.length === 0 && (
              <div className="text-sm text-zinc-500 text-center py-4">
                Nenhum agendamento ativo.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar mensagem' : 'Nova mensagem'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome interno</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Lembrete reunião" />
            </div>
            <div className="space-y-2">
              <Label>Texto</Label>
              <Textarea
                rows={6}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Digite o texto da mensagem (suporta *negrito*, _itálico_, ~tachado~)"
              />
            </div>
            <div className="flex items-start gap-3 rounded-md border p-3 bg-zinc-50 dark:bg-zinc-900">
              <Checkbox
                id="mentionAll"
                checked={mentionAll}
                onCheckedChange={(v) => setMentionAll(v === true)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label htmlFor="mentionAll" className="cursor-pointer font-medium">
                  Mencionar todos do grupo (@todos)
                </Label>
                <p className="text-xs text-zinc-500 mt-1">
                  Notifica todo mundo do grupo, mesmo quem está com chat silenciado. Recomendado pra
                  avisos importantes.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Anexos</Label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => pickAndUpload('IMAGE')} disabled={uploading !== null}>
                  <ImageIcon className="size-4 mr-1.5" />
                  {uploading === 'IMAGE' ? 'Enviando...' : 'Imagem'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => pickAndUpload('VIDEO')} disabled={uploading !== null}>
                  <Video className="size-4 mr-1.5" />
                  {uploading === 'VIDEO' ? 'Enviando...' : 'Vídeo'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => pickAndUpload('PTT')} disabled={uploading !== null}>
                  <Mic className="size-4 mr-1.5" />
                  {uploading === 'PTT' ? 'Enviando...' : 'Áudio (gravado)'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => pickAndUpload('AUDIO')} disabled={uploading !== null}>
                  <Music className="size-4 mr-1.5" />
                  {uploading === 'AUDIO' ? 'Enviando...' : 'Áudio (música)'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => pickAndUpload('DOCUMENT')} disabled={uploading !== null}>
                  <Paperclip className="size-4 mr-1.5" />
                  {uploading === 'DOCUMENT' ? 'Enviando...' : 'Anexo'}
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              {attachments.length > 0 && (
                <div className="space-y-2 mt-2">
                  {attachments.map((a, idx) => (
                    <div
                      key={`${a.mediaId}-${idx}`}
                      className="flex items-center gap-2 p-2 rounded border bg-zinc-50 dark:bg-zinc-900"
                    >
                      <span className="text-xs font-mono text-zinc-500">#{idx + 1}</span>
                      {a.media.mime.startsWith('image/') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.media.thumbUrl ?? a.media.url}
                          alt=""
                          className="size-10 object-cover rounded"
                        />
                      ) : (
                        <div className="size-10 rounded flex items-center justify-center bg-zinc-200 dark:bg-zinc-800">
                          {a.kind === 'PTT' || a.kind === 'AUDIO' ? (
                            <Mic className="size-4" />
                          ) : a.kind === 'VIDEO' ? (
                            <Video className="size-4" />
                          ) : (
                            <Paperclip className="size-4" />
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{KIND_LABEL[a.kind]}</div>
                        <div className="text-xs text-zinc-500 font-mono truncate">{a.media.mime}</div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => moveAttachment(idx, -1)} disabled={idx === 0}>
                        ↑
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => moveAttachment(idx, 1)} disabled={idx === attachments.length - 1}>
                        ↓
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeAttachment(idx)}>
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={() => save.mutate()} disabled={!name || save.isPending}>
              {save.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
