'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Building2,
  CheckCircle2,
  Copy,
  KeyRound,
  MessageCircle,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  failureWebhookUrl: string | null;
  defaultInstanceName: string | null;
  defaultParticipants: string[];
  hasDefaultInstanceToken: boolean;
}

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

type Section = 'geral' | 'whatsapp' | 'participantes' | 'api-keys';

const SECTIONS: { id: Section; label: string; icon: typeof Building2; description: string }[] = [
  {
    id: 'geral',
    label: 'Geral',
    icon: Building2,
    description: 'Conta, fuso horário e webhook de notificação.',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageCircle,
    description: 'Conexão Uazapi padrão usada pelas ações.',
  },
  {
    id: 'participantes',
    label: 'Participantes',
    icon: Users,
    description: 'Contatos adicionados automaticamente em novos grupos.',
  },
  {
    id: 'api-keys',
    label: 'API Keys',
    icon: KeyRound,
    description: 'Chaves para integrações externas (n8n, scripts).',
  },
];

export default function SettingsPage() {
  const qc = useQueryClient();
  const [section, setSection] = useState<Section>('geral');

  const { data: tenant } = useQuery<Tenant>({
    queryKey: ['tenant'],
    queryFn: async () => (await api.get('/tenant')).data,
  });

  const [tz, setTz] = useState('');
  const [webhook, setWebhook] = useState('');
  const [keyName, setKeyName] = useState('');
  const [newKeyPlain, setNewKeyPlain] = useState<string | null>(null);

  const [defaultInstanceName, setDefaultInstanceName] = useState('');
  const [defaultInstanceToken, setDefaultInstanceToken] = useState('');
  const [defaultParticipants, setDefaultParticipants] = useState('');

  useEffect(() => {
    if (tenant) {
      setTz(tenant.timezone);
      setWebhook(tenant.failureWebhookUrl ?? '');
      setDefaultInstanceName(tenant.defaultInstanceName ?? '');
      setDefaultParticipants((tenant.defaultParticipants ?? []).join('\n'));
    }
  }, [tenant]);

  const updateTenant = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        timezone: tz,
        failureWebhookUrl: webhook || null,
        defaultInstanceName: defaultInstanceName || null,
        defaultParticipants: defaultParticipants
          .split(/[\s,;]+/)
          .map((p) => p.trim().replace(/\D/g, ''))
          .filter((p) => p.length >= 10 && p.length <= 15),
      };
      if (defaultInstanceToken) payload.defaultInstanceToken = defaultInstanceToken;
      await api.patch('/tenant', payload);
    },
    onSuccess: () => {
      toast.success('Configurações salvas');
      setDefaultInstanceToken('');
      qc.invalidateQueries({ queryKey: ['tenant'] });
    },
  });

  const clearToken = useMutation({
    mutationFn: async () => api.patch('/tenant', { defaultInstanceToken: null }),
    onSuccess: () => {
      toast.success('Token removido');
      qc.invalidateQueries({ queryKey: ['tenant'] });
    },
  });

  const { data: keys = [] } = useQuery<ApiKey[]>({
    queryKey: ['api-keys'],
    queryFn: async () => (await api.get('/api-keys')).data,
  });

  const createKey = useMutation({
    mutationFn: async () => (await api.post('/api-keys', { name: keyName, scopes: ['*'] })).data,
    onSuccess: (data: { plain: string }) => {
      setNewKeyPlain(data.plain);
      setKeyName('');
      qc.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const revokeKey = useMutation({
    mutationFn: async (id: string) => api.delete(`/api-keys/${id}`),
    onSuccess: () => {
      toast.success('Chave revogada');
      qc.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1 pb-4 border-b">
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie sua conta, integrações e padrões usados em toda a plataforma.
        </p>
      </div>

      <div className="flex gap-8">
        <aside className="w-56 shrink-0">
          <nav className="flex flex-col gap-0.5 sticky top-4">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors text-left',
                    active
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  <Icon className={cn('size-4 shrink-0', active && 'text-foreground')} />
                  {s.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 max-w-3xl space-y-8 min-w-0">
          {section === 'geral' && (
            <SectionPanel
              title="Geral"
              description="Informações da conta, fuso horário e notificação de falhas."
              footer={
                <Button onClick={() => updateTenant.mutate()} disabled={updateTenant.isPending}>
                  {updateTenant.isPending ? 'Salvando…' : 'Salvar'}
                </Button>
              }
            >
              <FormRow
                label="Conta"
                helper="Identificador da organização. Não pode ser alterado por aqui."
              >
                <div className="flex h-9 items-center gap-2 rounded-md border bg-muted/30 px-3 text-sm">
                  <span className="font-medium">{tenant?.name ?? '—'}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    ({tenant?.slug ?? '—'})
                  </span>
                </div>
              </FormRow>

              <FormRow
                label="Fuso horário"
                helper="Usado pra agendar disparos no horário local correto."
              >
                <Input value={tz} onChange={(e) => setTz(e.target.value)} placeholder="America/Sao_Paulo" />
              </FormRow>

              <FormRow
                label="Webhook de falhas"
                helper="URL chamada quando um disparo falha. Deixe em branco pra desativar."
              >
                <Input
                  type="url"
                  value={webhook}
                  onChange={(e) => setWebhook(e.target.value)}
                  placeholder="https://hooks.exemplo.com/zappfy"
                />
              </FormRow>
            </SectionPanel>
          )}

          {section === 'whatsapp' && (
            <SectionPanel
              title="Conexão WhatsApp padrão"
              description="Quando configurada, todas as ações (criar grupo, sincronizar, disparar) usam essa conexão automaticamente — sem precisar colar nome+token toda vez."
              footer={
                <Button onClick={() => updateTenant.mutate()} disabled={updateTenant.isPending}>
                  {updateTenant.isPending ? 'Salvando…' : 'Salvar conexão'}
                </Button>
              }
            >
              <FormRow
                label="Status"
                helper={
                  tenant?.hasDefaultInstanceToken
                    ? 'Token salvo e criptografado. Pronto pra uso.'
                    : 'Nenhum token salvo. Configure abaixo.'
                }
              >
                {tenant?.hasDefaultInstanceToken ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="size-3" />
                      Conectado
                    </span>
                    <button
                      type="button"
                      onClick={() => clearToken.mutate()}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remover token
                    </button>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    Desconectado
                  </span>
                )}
              </FormRow>

              <FormRow
                label="Nome da instância"
                helper="ID único da sessão Uazapi. Geralmente um UUID."
              >
                <Input
                  value={defaultInstanceName}
                  onChange={(e) => setDefaultInstanceName(e.target.value)}
                  placeholder="ex: 4f9d2a5f-ab56-4e43-8b13-1f932b2e0c22"
                  className="font-mono text-xs"
                />
              </FormRow>

              <FormRow
                label="Token"
                helper={
                  tenant?.hasDefaultInstanceToken
                    ? 'Deixe em branco pra manter o token atual. Cole um novo pra substituir.'
                    : 'Cole o token raw da Uazapi. Será criptografado antes de armazenar.'
                }
              >
                <Input
                  type="password"
                  value={defaultInstanceToken}
                  onChange={(e) => setDefaultInstanceToken(e.target.value)}
                  placeholder={
                    tenant?.hasDefaultInstanceToken ? '•••••••• (manter atual)' : 'cole o token Uazapi'
                  }
                  className="font-mono"
                />
              </FormRow>
            </SectionPanel>
          )}

          {section === 'participantes' && (
            <SectionPanel
              title="Participantes padrão"
              description="Contatos adicionados automaticamente em todo grupo criado pela ferramenta. Útil pra incluir admins/operadores fixos sem precisar adicionar manualmente."
              footer={
                <Button onClick={() => updateTenant.mutate()} disabled={updateTenant.isPending}>
                  {updateTenant.isPending ? 'Salvando…' : 'Salvar participantes'}
                </Button>
              }
            >
              <FormRow
                label="Números de telefone"
                helper="Com DDI, um por linha ou separados por vírgula. Apenas dígitos. Duplicados são removidos automaticamente."
              >
                <Textarea
                  rows={5}
                  value={defaultParticipants}
                  onChange={(e) => setDefaultParticipants(e.target.value)}
                  placeholder="5521999999999&#10;5511988887777"
                  className="font-mono text-sm"
                />
              </FormRow>
            </SectionPanel>
          )}

          {section === 'api-keys' && (
            <SectionPanel
              title="API Keys"
              description="Chaves usadas por integrações externas (n8n, scripts, MCP) pra autenticar na API. A chave aparece apenas uma vez na criação — guarde com cuidado."
            >
              <FormRow
                label="Criar nova chave"
                helper="Dê um nome que ajude a identificar onde essa chave é usada."
              >
                <div className="flex gap-2">
                  <Input
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="ex: integração n8n"
                  />
                  <Button onClick={() => createKey.mutate()} disabled={!keyName || createKey.isPending}>
                    <Plus className="size-4 mr-1.5" />
                    Criar
                  </Button>
                </div>
              </FormRow>

              <div className="space-y-2 pt-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Chaves existentes ({keys.filter((k) => !k.revokedAt).length})
                </Label>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead>Nome</TableHead>
                        <TableHead>Prefixo</TableHead>
                        <TableHead>Último uso</TableHead>
                        <TableHead>Criada</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {keys.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            Nenhuma chave criada.
                          </TableCell>
                        </TableRow>
                      )}
                      {keys.map((k) => (
                        <TableRow key={k.id} className={k.revokedAt ? 'opacity-50' : ''}>
                          <TableCell className="font-medium">{k.name}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {k.prefix}…
                          </TableCell>
                          <TableCell className="text-sm">
                            {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString('pt-BR') : '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(k.createdAt).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            {!k.revokedAt && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-destructive"
                                onClick={() => revokeKey.mutate(k.id)}
                                title="Revogar"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </SectionPanel>
          )}
        </div>
      </div>

      <Dialog open={!!newKeyPlain} onOpenChange={(o) => !o && setNewKeyPlain(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sua nova chave</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Copie agora — não exibimos novamente depois de fechar essa janela.
            </p>
            <pre className="bg-muted p-3 rounded-md text-xs break-all font-mono">{newKeyPlain}</pre>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(newKeyPlain!);
                toast.success('Copiada');
              }}
              className="w-full"
            >
              <Copy className="size-4 mr-2" />
              Copiar chave
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionPanel({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div>
      <div className="space-y-1 mb-4">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="p-6 space-y-6">{children}</div>
        {footer && (
          <div className="border-t bg-muted/30 px-6 py-3 flex justify-end">{footer}</div>
        )}
      </div>
    </div>
  );
}

function FormRow({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3 md:gap-6">
      <div className="space-y-1">
        <Label className="font-medium">{label}</Label>
        {helper && <p className="text-xs text-muted-foreground leading-relaxed">{helper}</p>}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
