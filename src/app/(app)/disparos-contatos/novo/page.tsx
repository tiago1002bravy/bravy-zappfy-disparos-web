'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface WabaTemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  bodyText: string | null;
  variableCount: number;
  headerType: string;
}

interface InstanceItem {
  id: string;
  label: string;
  provider: 'UAZAPI' | 'CLOUD_API';
  displayPhoneNumber: string | null;
  active: boolean;
}

interface ContactCounts {
  leads: number;
  buyers: number;
  total: number;
}

type VarSource = { type: 'field'; field: 'name' | 'phone' | 'email' } | { type: 'static'; value: string };

const AUDIENCES = [
  { id: 'LEAD', label: 'Leads' },
  { id: 'BUYER', label: 'Compradores' },
  { id: 'ALL', label: 'Todos' },
] as const;

export default function NovaCampanhaPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [vars, setVars] = useState<VarSource[]>([]);
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [audience, setAudience] = useState<'LEAD' | 'BUYER' | 'ALL'>('LEAD');
  const [instanceIds, setInstanceIds] = useState<string[]>([]);
  const [throttle, setThrottle] = useState(60);
  const [startMode, setStartMode] = useState<'now' | 'later'>('now');
  const [startAt, setStartAt] = useState('');

  const { data: templates = [] } = useQuery<WabaTemplate[]>({
    queryKey: ['waba-templates', 'APPROVED'],
    queryFn: async () => (await api.get('/waba-templates', { params: { status: 'APPROVED' } })).data,
  });

  const { data: instances = [] } = useQuery<InstanceItem[]>({
    queryKey: ['instances'],
    queryFn: async () => (await api.get('/instances')).data,
  });
  const cloudInstances = instances.filter((i) => i.provider === 'CLOUD_API' && i.active);

  const { data: counts } = useQuery<ContactCounts>({
    queryKey: ['contacts-counts'],
    queryFn: async () => (await api.get('/contacts/counts')).data,
  });

  const template = useMemo(() => templates.find((t) => t.id === templateId) ?? null, [templates, templateId]);
  const audienceCount =
    audience === 'LEAD' ? counts?.leads : audience === 'BUYER' ? counts?.buyers : counts?.total;

  function pickTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    setVars(Array.from({ length: t?.variableCount ?? 0 }, () => ({ type: 'static', value: '' }) as VarSource));
  }

  function buildTemplateVariables(): string[] {
    return vars.map((v) => (v.type === 'field' ? `{{contact.${v.field}}}` : v.value));
  }

  const createCampaign = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name,
        templateId,
        templateVariables: buildTemplateVariables(),
        audienceKind: audience,
        instanceIds,
        throttlePerMinute: throttle,
      };
      if (headerMediaUrl) payload.headerMediaUrl = headerMediaUrl;
      if (startMode === 'later' && startAt) payload.startAt = new Date(startAt).toISOString();
      return (await api.post('/campaigns', payload)).data;
    },
    onSuccess: (data: { id: string; total: number }) => {
      toast.success(`Campanha criada (${data.total.toLocaleString('pt-BR')} alvos)`);
      router.push('/disparos-contatos');
    },
    onError: (err: unknown) => {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(typeof m === 'string' ? m : 'Falha ao criar campanha');
    },
  });

  const step1Ok = Boolean(name && template && vars.every((v) => (v.type === 'static' ? v.value.trim() : true)));
  const step2Ok = (audienceCount ?? 0) > 0;
  const step3Ok = cloudInstances.length > 0;
  const needsHeaderMedia = template && !['NONE', 'TEXT'].includes(template.headerType);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Nova campanha 1:1</h1>
        <p className="text-sm text-muted-foreground">Etapa {step} de 4</p>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>1. Template e variáveis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome da campanha</Label>
              <Input
                placeholder="Ex: Promo Agosto — Leads"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Template aprovado (Meta)</Label>
              <Select value={templateId} onValueChange={(v) => pickTemplate(v ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} · {t.language}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templates.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum template APPROVED. Sincronize em Templates Meta.
                </p>
              )}
            </div>
            {template?.bodyText && (
              <div className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm">
                {template.bodyText}
              </div>
            )}
            {vars.map((v, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="w-40 shrink-0 space-y-1.5">
                  <Label className="text-xs">{`Variável {{${idx + 1}}}`}</Label>
                  <Select
                    value={v.type === 'field' ? `field:${v.field}` : 'static'}
                    onValueChange={(sel) => {
                      const next = [...vars];
                      next[idx] = sel?.startsWith('field:')
                        ? { type: 'field', field: sel.slice(6) as 'name' | 'phone' | 'email' }
                        : { type: 'static', value: v.type === 'static' ? v.value : '' };
                      setVars(next);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="static">Texto fixo</SelectItem>
                      <SelectItem value="field:name">Nome do contato</SelectItem>
                      <SelectItem value="field:phone">Telefone do contato</SelectItem>
                      <SelectItem value="field:email">E-mail do contato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {v.type === 'static' && (
                  <Input
                    placeholder="Valor"
                    value={v.value}
                    onChange={(e) => {
                      const next = [...vars];
                      next[idx] = { type: 'static', value: e.target.value };
                      setVars(next);
                    }}
                  />
                )}
              </div>
            ))}
            {needsHeaderMedia && (
              <div className="space-y-1.5">
                <Label>URL da mídia do header ({template!.headerType})</Label>
                <Input
                  placeholder="https://..."
                  value={headerMediaUrl}
                  onChange={(e) => setHeaderMediaUrl(e.target.value)}
                />
              </div>
            )}
            <div className="flex justify-end">
              <Button disabled={!step1Ok || (needsHeaderMedia ? !headerMediaUrl : false)} onClick={() => setStep(2)}>
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>2. Audiência</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center overflow-hidden rounded-md border w-fit">
              {AUDIENCES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAudience(a.id)}
                  className={cn(
                    'px-4 py-1.5 text-sm transition-colors',
                    audience === a.id ? 'bg-brand text-brand-foreground' : 'hover:bg-muted',
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {audienceCount !== undefined
                ? `${(audienceCount ?? 0).toLocaleString('pt-BR')} contatos serão alvo desta campanha.`
                : 'Carregando contagem…'}
            </p>
            {!step2Ok && (
              <p className="text-sm text-red-700 dark:text-red-400">
                Audiência vazia — rode o sync em Contatos antes.
              </p>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button disabled={!step2Ok} onClick={() => setStep(3)}>
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>3. Números (Cloud API)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cloudInstances.length === 0 && (
              <p className="text-sm text-red-700 dark:text-red-400">
                Nenhuma instância Cloud API ativa. Cadastre em Settings → Instancias.
              </p>
            )}
            <div className="space-y-2">
              {cloudInstances.map((inst) => (
                <label key={inst.id} className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <Checkbox
                    checked={instanceIds.includes(inst.id)}
                    onCheckedChange={(checked) =>
                      setInstanceIds((prev) =>
                        checked ? [...prev, inst.id] : prev.filter((id) => id !== inst.id),
                      )
                    }
                  />
                  {inst.label}
                  {inst.displayPhoneNumber && (
                    <span className="text-xs text-muted-foreground">{inst.displayPhoneNumber}</span>
                  )}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Nenhum marcado = usa todas as instâncias Cloud API ativas. A distribuição é round-robin
              respeitando o limite de 24h de cada número.
            </p>
            <div className="w-56 space-y-1.5">
              <Label>Ritmo (msgs/min por número)</Label>
              <Input
                type="number"
                min={1}
                max={600}
                value={throttle}
                onChange={(e) => setThrottle(Math.max(1, Number(e.target.value)))}
              />
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Voltar
              </Button>
              <Button disabled={!step3Ok} onClick={() => setStep(4)}>
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>4. Agendamento e revisão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center overflow-hidden rounded-md border w-fit">
              <button
                type="button"
                onClick={() => setStartMode('now')}
                className={cn(
                  'px-4 py-1.5 text-sm transition-colors',
                  startMode === 'now' ? 'bg-brand text-brand-foreground' : 'hover:bg-muted',
                )}
              >
                Disparar agora
              </button>
              <button
                type="button"
                onClick={() => setStartMode('later')}
                className={cn(
                  'px-4 py-1.5 text-sm transition-colors',
                  startMode === 'later' ? 'bg-brand text-brand-foreground' : 'hover:bg-muted',
                )}
              >
                Agendar
              </button>
            </div>
            {startMode === 'later' && (
              <Input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-60"
              />
            )}
            <div className="space-y-1 rounded-md border bg-muted/40 p-3 text-sm">
              <div>
                <span className="text-muted-foreground">Campanha:</span> {name}
              </div>
              <div>
                <span className="text-muted-foreground">Template:</span>{' '}
                <span className="font-mono text-xs">{template?.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Audiência:</span>{' '}
                {AUDIENCES.find((a) => a.id === audience)?.label} (
                {(audienceCount ?? 0).toLocaleString('pt-BR')} contatos)
              </div>
              <div>
                <span className="text-muted-foreground">Números:</span>{' '}
                {instanceIds.length
                  ? cloudInstances
                      .filter((i) => instanceIds.includes(i.id))
                      .map((i) => i.label)
                      .join(', ')
                  : `todas Cloud API (${cloudInstances.length})`}
              </div>
              <div>
                <span className="text-muted-foreground">Ritmo:</span> {throttle} msgs/min por número
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>
                Voltar
              </Button>
              <Button
                disabled={createCampaign.isPending || (startMode === 'later' && !startAt)}
                onClick={() => createCampaign.mutate()}
              >
                {createCampaign.isPending ? 'Criando…' : 'Criar campanha'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
