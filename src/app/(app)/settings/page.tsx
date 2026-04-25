'use client';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Trash2, Plus } from 'lucide-react';

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

export default function SettingsPage() {
  const qc = useQueryClient();
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
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle>Tenant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-zinc-500">
            <strong>{tenant?.name}</strong> ({tenant?.slug})
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Input value={tz} onChange={(e) => setTz(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>URL de webhook para falhas</Label>
            <Input
              type="url"
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
              placeholder="https://hooks.exemplo.com/zappfy"
            />
          </div>
          <Button onClick={() => updateTenant.mutate()} disabled={updateTenant.isPending}>
            Salvar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conexão WhatsApp padrão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-500">
            Cadastre uma instância Uazapi padrão da conta. Quando configurada, todas as ações (criar
            grupo, sincronizar, disparar) usam esta conexão automaticamente — você não precisa colar
            nome+token toda vez.
          </p>
          <div className="space-y-2">
            <Label>Nome da instância</Label>
            <Input
              value={defaultInstanceName}
              onChange={(e) => setDefaultInstanceName(e.target.value)}
              placeholder="ex: bravy-marketing"
            />
          </div>
          <div className="space-y-2">
            <Label>
              Token {tenant?.hasDefaultInstanceToken && <span className="text-xs text-green-600">(salvo, criptografado)</span>}
            </Label>
            <Input
              type="password"
              value={defaultInstanceToken}
              onChange={(e) => setDefaultInstanceToken(e.target.value)}
              placeholder={tenant?.hasDefaultInstanceToken ? '•••••••• (deixe em branco pra manter)' : 'cole o token Uazapi'}
            />
            {tenant?.hasDefaultInstanceToken && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearToken.mutate()}
                className="text-xs text-red-600"
              >
                Remover token salvo
              </Button>
            )}
          </div>
          <Button onClick={() => updateTenant.mutate()} disabled={updateTenant.isPending}>
            Salvar conexão
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Participantes padrão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-500">
            Esses contatos serão adicionados automaticamente em <strong>todo grupo criado</strong>{' '}
            pela ferramenta. Útil pra incluir admins/operadores fixos.
          </p>
          <div className="space-y-2">
            <Label>Números (com DDI, um por linha ou separados por vírgula)</Label>
            <Textarea
              rows={4}
              value={defaultParticipants}
              onChange={(e) => setDefaultParticipants(e.target.value)}
              placeholder="5521999999999&#10;5511988887777"
            />
            <p className="text-xs text-zinc-500">
              Apenas dígitos. Os duplicados são removidos automaticamente.
            </p>
          </div>
          <Button onClick={() => updateTenant.mutate()} disabled={updateTenant.isPending}>
            Salvar participantes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="Nome da chave (ex: integração n8n)"
            />
            <Button onClick={() => createKey.mutate()} disabled={!keyName || createKey.isPending}>
              <Plus className="size-4 mr-2" />
              Criar
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Prefixo</TableHead>
                <TableHead>Último uso</TableHead>
                <TableHead>Criada</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell>{k.name}</TableCell>
                  <TableCell className="font-mono text-xs">{k.prefix}...</TableCell>
                  <TableCell>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString('pt-BR') : '-'}</TableCell>
                  <TableCell>{new Date(k.createdAt).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>
                    {!k.revokedAt && (
                      <Button variant="ghost" size="icon" onClick={() => revokeKey.mutate(k.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!newKeyPlain} onOpenChange={(o) => !o && setNewKeyPlain(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sua nova chave</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-zinc-600">
              Copie agora — não exibimos novamente.
            </p>
            <pre className="bg-zinc-100 dark:bg-zinc-900 p-3 rounded text-xs break-all">
              {newKeyPlain}
            </pre>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(newKeyPlain!);
                toast.success('Copiada');
              }}
            >
              Copiar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
