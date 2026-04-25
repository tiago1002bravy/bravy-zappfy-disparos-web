'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InstanceCredentialsField, type InstanceCreds } from '@/components/instance-credentials-field';
import { toast } from 'sonner';

interface Group {
  id: string;
  remoteId: string;
  name: string;
  instanceName: string;
}

interface Message {
  id: string;
  name: string;
}

interface GroupList {
  id: string;
  name: string;
  color: string | null;
  _count: { memberships: number };
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function NovoAgendamentoPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [messageId, setMessageId] = useState('');
  const [creds, setCreds] = useState<InstanceCreds>({ instanceName: '', instanceToken: '' });
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);

  const [type, setType] = useState<'ONCE' | 'DAILY' | 'WEEKLY' | 'CUSTOM_CRON'>('ONCE');
  const [startAt, setStartAt] = useState('');
  const [time, setTime] = useState('09:00');
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [cron, setCron] = useState('0 9 * * *');
  const [preview, setPreview] = useState<string[]>([]);

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['messages'],
    queryFn: async () => (await api.get('/messages')).data,
  });

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['groups', creds.instanceName],
    queryFn: async () =>
      (await api.get('/groups', { params: { instanceName: creds.instanceName || undefined } })).data,
    enabled: step >= 2,
  });

  const { data: groupLists = [] } = useQuery<GroupList[]>({
    queryKey: ['group-lists'],
    queryFn: async () => (await api.get('/group-lists')).data,
    enabled: step >= 2,
  });

  useEffect(() => {
    async function fetchPreview() {
      try {
        let expr = '';
        if (type === 'DAILY') {
          const [h, m] = time.split(':');
          expr = `${parseInt(m, 10)} ${parseInt(h, 10)} * * *`;
        } else if (type === 'WEEKLY') {
          const [h, m] = time.split(':');
          expr = `${parseInt(m, 10)} ${parseInt(h, 10)} * * ${weekdays.join(',')}`;
        } else if (type === 'CUSTOM_CRON') {
          expr = cron;
        } else {
          setPreview(startAt ? [startAt] : []);
          return;
        }
        const { data } = await api.get('/cron/preview', { params: { expr } });
        setPreview(data.occurrences);
      } catch {
        setPreview([]);
      }
    }
    if (step === 3) fetchPreview();
  }, [step, type, time, weekdays, cron, startAt]);

  const submit = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        messageId,
        groupRemoteIds: selectedGroups,
        groupListIds: selectedLists,
        type,
        startAt: startAt || new Date().toISOString(),
      };
      if (!creds.useAccountDefault) {
        payload.instanceName = creds.instanceName;
        payload.instanceToken = creds.instanceToken;
      }
      if (type === 'DAILY' || type === 'WEEKLY') payload.time = time;
      if (type === 'WEEKLY') payload.weekdays = weekdays;
      if (type === 'CUSTOM_CRON') payload.cron = cron;
      await api.post('/schedules', payload);
    },
    onSuccess: () => {
      toast.success('Agendamento criado');
      router.replace('/agendamentos');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro';
      toast.error(typeof msg === 'string' ? msg : 'Falha');
    },
  });

  function toggleGroup(remoteId: string) {
    setSelectedGroups((prev) =>
      prev.includes(remoteId) ? prev.filter((g) => g !== remoteId) : [...prev, remoteId],
    );
  }

  function toggleList(id: string) {
    setSelectedLists((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleWeekday(d: number) {
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Novo agendamento</h1>
        <p className="text-sm text-zinc-500">Etapa {step} de 4</p>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>1. Escolha a mensagem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={messageId} onValueChange={(v) => setMessageId(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                {messages.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button disabled={!messageId} onClick={() => setStep(2)}>
              Próximo
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>2. Instância e grupos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InstanceCredentialsField value={creds} onChange={setCreds} />

            {groupLists.length > 0 && (
              <div>
                <Label className="mb-2 block">Listas ({selectedLists.length} selecionadas)</Label>
                <div className="flex flex-wrap gap-2">
                  {groupLists.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => toggleList(l.id)}
                      className={`px-3 py-1 rounded-full text-xs border-2 flex items-center gap-2 ${selectedLists.includes(l.id) ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-zinc-200 dark:border-zinc-700'}`}
                    >
                      <span className="size-2 rounded-full" style={{ background: l.color ?? '#ccc' }} />
                      {l.name}
                      <span className="text-zinc-500">({l._count.memberships})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label className="mb-2 block">Grupos individuais ({selectedGroups.length} selecionados)</Label>
              <div className="border rounded max-h-64 overflow-auto divide-y">
                {groups.length === 0 && (
                  <div className="p-4 text-sm text-zinc-500">
                    Nenhum grupo cadastrado. Sincronize na tela &quot;Grupos&quot; primeiro.
                  </div>
                )}
                {groups.map((g) => (
                  <label key={g.id} className="flex items-center gap-2 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer">
                    <Checkbox
                      checked={selectedGroups.includes(g.remoteId)}
                      onCheckedChange={() => toggleGroup(g.remoteId)}
                    />
                    <span className="flex-1 text-sm">{g.name}</span>
                    <span className="text-xs text-zinc-500">{g.instanceName}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button
                disabled={
                  (!creds.useAccountDefault &&
                    (!creds.instanceName || !creds.instanceToken)) ||
                  (selectedGroups.length === 0 && selectedLists.length === 0)
                }
                onClick={() => setStep(3)}
              >
                Próximo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>3. Recorrência</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <div className="space-y-2">
                <Label>Data e hora</Label>
                <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              </div>
            )}

            {(type === 'DAILY' || type === 'WEEKLY') && (
              <>
                <div className="space-y-2">
                  <Label>Início (a partir de quando)</Label>
                  <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
              </>
            )}

            {type === 'WEEKLY' && (
              <div className="space-y-2">
                <Label>Dias da semana</Label>
                <div className="flex gap-1">
                  {WEEKDAYS.map((label, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleWeekday(idx)}
                      className={`px-3 py-1 rounded text-xs border ${weekdays.includes(idx) ? 'bg-blue-500 text-white border-blue-500' : ''}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {type === 'CUSTOM_CRON' && (
              <div className="space-y-2">
                <Label>Cron expression</Label>
                <Input value={cron} onChange={(e) => setCron(e.target.value)} placeholder="0 9 * * *" />
                <Label>Início</Label>
                <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              </div>
            )}

            <div className="space-y-2">
              <Label>Próximas execuções</Label>
              <div className="rounded-md border bg-zinc-50 dark:bg-zinc-900 p-3 text-xs space-y-1">
                {preview.length === 0 ? (
                  <span className="text-zinc-500">Defina os campos acima</span>
                ) : (
                  preview.map((p, i) => (
                    <div key={i}>{new Date(p).toLocaleString('pt-BR')}</div>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Voltar
              </Button>
              <Button onClick={() => setStep(4)}>Próximo</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>4. Revisar e criar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div>
                <strong>Mensagem:</strong> {messages.find((m) => m.id === messageId)?.name}
              </div>
              <div>
                <strong>Instância:</strong> {creds.instanceName}
              </div>
              <div>
                <strong>Grupos individuais:</strong> {selectedGroups.length}
              </div>
              <div>
                <strong>Listas:</strong> {selectedLists.length}
              </div>
              <div>
                <strong>Tipo:</strong> {type}
              </div>
              <div>
                <strong>Próximas:</strong>
                <ul className="ml-4 list-disc">
                  {preview.slice(0, 3).map((p, i) => (
                    <li key={i}>{new Date(p).toLocaleString('pt-BR')}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>
                Voltar
              </Button>
              <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
                {submit.isPending ? 'Criando...' : 'Criar agendamento'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
