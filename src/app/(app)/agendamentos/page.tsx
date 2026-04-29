'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endOfDay, startOfDay, subDays } from 'date-fns';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { AlertTriangle, ExternalLink, Pause, Play, Plus, Trash2, X } from 'lucide-react';

function Countdown({ target }: { target: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return <span className="text-xs text-zinc-400">disparando…</span>;
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  let label = '';
  if (d > 0) label = `${d}d ${h}h`;
  else if (h > 0) label = `${h}h ${String(m).padStart(2, '0')}m`;
  else label = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const urgent = ms < 60_000;
  return (
    <span className={`text-xs font-mono tabular-nums ${urgent ? 'text-orange-500' : 'text-zinc-500'}`}>
      {label}
    </span>
  );
}

interface ExecutionStats {
  success: number;
  failed: number;
  skipped: number;
  total: number;
}

interface Schedule {
  id: string;
  type: 'ONCE' | 'DAILY' | 'WEEKLY' | 'CUSTOM_CRON';
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELED';
  startAt: string;
  cron: string | null;
  instanceName: string;
  groupRemoteIds: string[];
  message: { id: string; name: string; text?: string | null };
  _count: { executions: number };
  executionStats?: ExecutionStats;
}

type MediaKind = 'AUTO' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PTT' | 'DOCUMENT';

interface MessageDetail {
  id: string;
  name: string;
  text: string | null;
  mentionAll: boolean;
  medias: {
    id: string;
    order: number;
    kind: MediaKind;
    url: string;
    thumbUrl: string | null;
    media: { id: string; mime: string };
  }[];
}

type DisplayStatus =
  | 'concluido'
  | 'falhou'
  | 'agendado'
  | 'pausado'
  | 'cancelado'
  | 'ativo';

const DISPLAY_STATUS_META: Record<DisplayStatus, { label: string; className: string }> = {
  concluido: {
    label: 'Concluído',
    className:
      'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/50',
  },
  falhou: {
    label: 'Falhou',
    className:
      'bg-red-600 text-white border border-red-700 font-semibold shadow-sm dark:bg-red-600 dark:text-white dark:border-red-800',
  },
  agendado: {
    label: 'Agendado',
    className:
      'bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-700/50',
  },
  pausado: {
    label: 'Pausado',
    className:
      'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/50',
  },
  cancelado: {
    label: 'Cancelado',
    className:
      'bg-zinc-100 text-zinc-600 border border-zinc-300 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-700',
  },
  ativo: {
    label: 'Ativo',
    className:
      'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700/50',
  },
};

const EMPTY_STATS: ExecutionStats = { success: 0, failed: 0, skipped: 0, total: 0 };

function statsOf(s: Schedule): ExecutionStats {
  return s.executionStats ?? EMPTY_STATS;
}

function deriveDisplayStatus(s: Schedule, nowMs: number): DisplayStatus {
  if (s.status === 'CANCELED') return 'cancelado';
  if (s.status === 'PAUSED') return 'pausado';
  const stats = statsOf(s);
  // Falhou = nada chegou. Parcial (algumas falhas) ainda é Concluído — a coluna Execuções mostra ✓/✗.
  const nothingArrived = stats.total > 0 && stats.success === 0;
  if (s.status === 'COMPLETED') {
    if (stats.total === 0 || nothingArrived) return 'falhou';
    return 'concluido';
  }
  // ACTIVE
  if (s.type !== 'ONCE') return 'ativo';
  const startMs = new Date(s.startAt).getTime();
  if (startMs < nowMs - 60_000) {
    if (stats.total === 0) return 'falhou';
    if (nothingArrived) return 'falhou';
    return 'concluido';
  }
  return 'agendado';
}

type Bucket = 'hoje' | 'proximos' | 'historico';

function bucketFor(s: Schedule, now: Date): Bucket {
  // Recorrente: se cancelado vai pra histórico, senão sempre relevante hoje
  if (s.type !== 'ONCE') {
    if (s.status === 'CANCELED') return 'historico';
    return 'hoje';
  }
  // ONCE: bucket pela data do startAt (não pelo status)
  // Hoje fica em 'hoje' o dia inteiro, qualquer status (concluído, falhou, cancelado, agendado).
  const start = new Date(s.startAt).getTime();
  if (start < startOfDay(now).getTime()) return 'historico';
  if (start <= endOfDay(now).getTime()) return 'hoje';
  return 'proximos';
}

const HISTORY_RANGES = [
  { id: '7d', label: '7 dias', days: 7 },
  { id: '30d', label: '30 dias', days: 30 },
  { id: '90d', label: '90 dias', days: 90 },
  { id: 'all', label: 'Tudo', days: null as number | null },
] as const;

type HistoryRangeId = (typeof HISTORY_RANGES)[number]['id'];

export default function AgendamentosPage() {
  const qc = useQueryClient();
  const [historyRange, setHistoryRange] = useState<HistoryRangeId>('7d');
  const [previewSchedule, setPreviewSchedule] = useState<Schedule | null>(null);
  const { data = [] } = useQuery<Schedule[]>({
    queryKey: ['schedules'],
    queryFn: async () => (await api.get('/schedules')).data,
    refetchInterval: 5000,
  });

  const action = useMutation({
    mutationFn: async (params: { id: string; action: 'pause' | 'resume' | 'cancel' }) => {
      await api.patch(`/schedules/${params.id}`, { action: params.action });
    },
    onSuccess: () => {
      toast.success('Atualizado');
      qc.invalidateQueries({ queryKey: ['schedules'] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/schedules/${id}`),
    onSuccess: () => {
      toast.success('Removido');
      qc.invalidateQueries({ queryKey: ['schedules'] });
    },
  });

  const { hoje, proximos, historicoAll, recentFailures } = useMemo(() => {
    const now = new Date();
    const nowMs = now.getTime();
    const hoje: Schedule[] = [];
    const proximos: Schedule[] = [];
    const historicoAll: Schedule[] = [];
    let recentFailures = 0;
    const failureWindow = subDays(now, 1).getTime();
    for (const s of data) {
      const bucket = bucketFor(s, now);
      if (bucket === 'hoje') hoje.push(s);
      else if (bucket === 'proximos') proximos.push(s);
      else historicoAll.push(s);
      if (
        statsOf(s).failed > 0 &&
        new Date(s.startAt).getTime() >= failureWindow
      ) {
        recentFailures += 1;
      }
    }
    hoje.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    proximos.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    historicoAll.sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
    return { hoje, proximos, historicoAll, recentFailures };
  }, [data]);

  const historico = useMemo(() => {
    const range = HISTORY_RANGES.find((r) => r.id === historyRange)!;
    if (range.days === null) return historicoAll;
    const cutoff = subDays(new Date(), range.days).getTime();
    return historicoAll.filter((s) => new Date(s.startAt).getTime() >= cutoff);
  }, [historicoAll, historyRange]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 pb-5 border-b">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Agendamentos</h1>
          <p className="text-sm text-muted-foreground">Visão operacional dos disparos</p>
        </div>
        <Link href="/agendamentos/novo">
          <Button>
            <Plus className="size-4 mr-2" />
            Novo agendamento
          </Button>
        </Link>
      </div>

      {recentFailures > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle className="size-4 shrink-0" />
          <span className="flex-1">
            {recentFailures === 1
              ? '1 agendamento com falha nas últimas 24h. Revise no histórico.'
              : `${recentFailures} agendamentos com falha nas últimas 24h. Revise no histórico.`}
          </span>
        </div>
      )}

      <Tabs defaultValue="hoje" className="gap-4">
        <TabsList>
          <TabsTrigger value="hoje">
            Hoje
            <CountBadge value={hoje.length} />
          </TabsTrigger>
          <TabsTrigger value="proximos">
            Próximos
            <CountBadge value={proximos.length} />
          </TabsTrigger>
          <TabsTrigger value="historico">
            Histórico
            <CountBadge value={historicoAll.length} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hoje">
          <SchedulesTable
            rows={hoje}
            emptyText="Nada pra hoje. ✨"
            onAction={action.mutate}
            onRemove={(id) => {
              if (confirm('Remover permanentemente?')) remove.mutate(id);
            }}
            onPreview={setPreviewSchedule}
          />
        </TabsContent>

        <TabsContent value="proximos">
          <SchedulesTable
            rows={proximos}
            emptyText="Sem agendamentos futuros."
            onAction={action.mutate}
            onRemove={(id) => {
              if (confirm('Remover permanentemente?')) remove.mutate(id);
            }}
            onPreview={setPreviewSchedule}
          />
        </TabsContent>

        <TabsContent value="historico" className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Janela:</span>
            <div className="flex items-center rounded-md border overflow-hidden">
              {HISTORY_RANGES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setHistoryRange(r.id)}
                  className={`px-3 py-1 text-xs ${
                    historyRange === r.id ? 'bg-zinc-200 dark:bg-zinc-800' : ''
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              ({historico.length} de {historicoAll.length})
            </span>
          </div>
          <SchedulesTable
            rows={historico}
            emptyText="Nada no histórico desta janela."
            onAction={action.mutate}
            onRemove={(id) => {
              if (confirm('Remover permanentemente?')) remove.mutate(id);
            }}
            onPreview={setPreviewSchedule}
          />
        </TabsContent>
      </Tabs>

      <MessagePreviewDialog
        schedule={previewSchedule}
        onClose={() => setPreviewSchedule(null)}
      />
    </div>
  );
}

function MessagePreviewDialog({
  schedule,
  onClose,
}: {
  schedule: Schedule | null;
  onClose: () => void;
}) {
  const open = schedule !== null;
  const messageId = schedule?.message.id;
  const { data: detail, isLoading } = useQuery<MessageDetail>({
    queryKey: ['message-detail', messageId],
    queryFn: async () => (await api.get(`/messages/${messageId}`)).data,
    enabled: open && !!messageId,
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{schedule?.message.name ?? 'Mensagem'}</DialogTitle>
          <DialogDescription>
            {schedule
              ? `${new Date(schedule.startAt).toLocaleString('pt-BR')} · ${schedule.groupRemoteIds.length} grupo${schedule.groupRemoteIds.length === 1 ? '' : 's'}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}

          {detail && detail.medias.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {detail.medias
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((m) => (
                  <MediaPreview key={m.id} kind={m.kind} mime={m.media.mime} url={m.url} />
                ))}
            </div>
          )}

          {detail?.text ? (
            <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap leading-relaxed">
              {detail.text}
            </div>
          ) : detail && !isLoading ? (
            <div className="text-sm text-muted-foreground italic">Sem texto.</div>
          ) : null}
        </div>

        {schedule && (
          <DialogFooter>
            <Link
              href={`/agendamentos/${schedule.id}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              Abrir agendamento <ExternalLink className="size-3.5" />
            </Link>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MediaPreview({ kind, mime, url }: { kind: MediaKind; mime: string; url: string }) {
  const isImage = kind === 'IMAGE' || mime.startsWith('image/');
  const isVideo = kind === 'VIDEO' || mime.startsWith('video/');
  const isAudio = kind === 'AUDIO' || kind === 'PTT' || mime.startsWith('audio/');
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="w-full h-32 object-cover rounded-md border" />
      </a>
    );
  }
  if (isVideo) {
    return <video src={url} controls className="w-full h-32 object-cover rounded-md border" />;
  }
  if (isAudio) {
    return <audio src={url} controls className="w-full" />;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center h-32 rounded-md border bg-muted/30 text-xs text-muted-foreground hover:bg-muted/50"
    >
      Abrir documento
    </a>
  );
}

function CountBadge({ value }: { value: number }) {
  return (
    <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-medium tabular-nums text-muted-foreground">
      {value}
    </span>
  );
}

function SchedulesTable({
  rows,
  emptyText,
  onAction,
  onRemove,
  onPreview,
}: {
  rows: Schedule[];
  emptyText: string;
  onAction: (params: { id: string; action: 'pause' | 'resume' | 'cancel' }) => void;
  onRemove: (id: string) => void;
  onPreview: (s: Schedule) => void;
}) {
  const nowMs = Date.now();
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="py-3">Mensagem</TableHead>
            <TableHead className="py-3">Instância</TableHead>
            <TableHead className="py-3">Tipo</TableHead>
            <TableHead className="py-3">Início</TableHead>
            <TableHead className="py-3">Cron</TableHead>
            <TableHead className="text-right py-3">Grupos</TableHead>
            <TableHead className="text-right py-3">Execuções</TableHead>
            <TableHead className="py-3">Status</TableHead>
            <TableHead className="w-44 text-right py-3 pr-4">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                {emptyText}
              </TableCell>
            </TableRow>
          )}
          {rows.map((s) => {
            const display = deriveDisplayStatus(s, nowMs);
            const meta = DISPLAY_STATUS_META[display];
            const stats = statsOf(s);
            return (
              <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium align-top py-4">
                  <button
                    type="button"
                    onClick={() => onPreview(s)}
                    className="text-left hover:underline"
                  >
                    {s.message.name}
                  </button>
                </TableCell>
                <TableCell
                  className="align-top py-4 text-muted-foreground text-xs font-mono truncate max-w-[12rem]"
                  title={s.instanceName}
                >
                  {s.instanceName}
                </TableCell>
                <TableCell className="align-top py-4">
                  <Badge variant="outline" className="text-[10px] font-medium tracking-wide">
                    {s.type}
                  </Badge>
                </TableCell>
                <TableCell className="align-top py-4 tabular-nums text-sm">
                  {new Date(s.startAt).toLocaleString('pt-BR')}
                </TableCell>
                <TableCell className="align-top py-4 text-xs font-mono text-muted-foreground">
                  {s.cron ?? '—'}
                </TableCell>
                <TableCell className="text-right align-top py-4 tabular-nums">
                  {s.groupRemoteIds.length}
                </TableCell>
                <TableCell className="text-right align-top py-4 tabular-nums">
                  {stats.total > 0 ? (
                    <span className="text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400">{stats.success}✓</span>
                      {stats.failed > 0 && (
                        <span className="ml-1 text-red-600 dark:text-red-400">{stats.failed}✗</span>
                      )}
                      {stats.skipped > 0 && (
                        <span className="ml-1 text-amber-600 dark:text-amber-400">{stats.skipped}↷</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="align-top py-4">
                  <Badge className={meta.className}>{meta.label}</Badge>
                </TableCell>
                <TableCell className="text-right align-top py-3 pr-3">
                  <div className="flex items-center justify-end gap-2">
                    {s.status === 'ACTIVE' && s.type === 'ONCE' && (
                      <div className="hidden xl:flex items-center pr-1">
                        <Countdown target={s.startAt} />
                      </div>
                    )}
                    <div className="flex items-center gap-0.5 rounded-md border border-zinc-300 dark:border-zinc-600 bg-background/50">
                      {s.status === 'ACTIVE' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-r-none"
                          onClick={() => onAction({ id: s.id, action: 'pause' })}
                          title="Pausar"
                        >
                          <Pause className="size-4" />
                        </Button>
                      )}
                      {s.status === 'PAUSED' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-r-none"
                          onClick={() => onAction({ id: s.id, action: 'resume' })}
                          title="Retomar"
                        >
                          <Play className="size-4" />
                        </Button>
                      )}
                      {(s.status === 'ACTIVE' || s.status === 'PAUSED') && (
                        <>
                          <div className="h-5 w-px bg-zinc-300 dark:bg-zinc-600" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-l-none text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                            onClick={() => onAction({ id: s.id, action: 'cancel' })}
                            title="Cancelar"
                          >
                            <X className="size-4" />
                          </Button>
                        </>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onRemove(s.id)}
                      title="Excluir"
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
  );
}
