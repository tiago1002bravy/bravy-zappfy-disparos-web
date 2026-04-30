'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Workspace request dialog
  const [openRequest, setOpenRequest] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [reqWorkspaceName, setReqWorkspaceName] = useState('');
  const [reqWorkspaceSlug, setReqWorkspaceSlug] = useState('');
  const [reqName, setReqName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqPassword, setReqPassword] = useState('');
  const [reqReason, setReqReason] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        email: loginEmail,
        password: loginPassword,
      });
      localStorage.setItem('zd_access_token', data.accessToken);
      localStorage.setItem('zd_refresh_token', data.refreshToken);
      router.replace('/grupos');
    } catch {
      toast.error('Falha no login. Verifique e-mail e senha.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/workspace-requests', {
        name: reqWorkspaceName,
        slug: reqWorkspaceSlug,
        requesterName: reqName,
        requesterEmail: reqEmail,
        password: reqPassword,
        reason: reqReason || undefined,
      });
      setRequestSubmitted(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro';
      toast.error(typeof msg === 'string' ? msg : 'Erro ao enviar solicitação');
    } finally {
      setLoading(false);
    }
  }

  function resetRequest() {
    setRequestSubmitted(false);
    setReqWorkspaceName('');
    setReqWorkspaceSlug('');
    setReqName('');
    setReqEmail('');
    setReqPassword('');
    setReqReason('');
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Zappfy Disparos</CardTitle>
          <CardDescription>Agendamento de disparos WhatsApp</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground mb-2">Não tem um workspace?</p>
            <button
              type="button"
              onClick={() => {
                resetRequest();
                setOpenRequest(true);
              }}
              className="text-sm font-medium text-foreground hover:underline"
            >
              Solicitar novo workspace
            </button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={openRequest}
        onOpenChange={(o) => {
          setOpenRequest(o);
          if (!o) resetRequest();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {requestSubmitted ? 'Solicitação enviada' : 'Solicitar novo workspace'}
            </DialogTitle>
            <DialogDescription>
              {requestSubmitted
                ? 'Aguarde aprovação dos administradores. Você receberá acesso assim que liberado.'
                : 'Workspaces novos passam por aprovação manual antes do acesso ser liberado.'}
            </DialogDescription>
          </DialogHeader>

          {requestSubmitted ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="size-12 text-emerald-500" />
              <div className="text-center space-y-1">
                <div className="font-medium">Tudo certo!</div>
                <div className="text-sm text-muted-foreground">
                  Sua solicitação foi registrada e está aguardando revisão.
                </div>
              </div>
              <Button onClick={() => setOpenRequest(false)} className="mt-2">
                Fechar
              </Button>
            </div>
          ) : (
            <form onSubmit={handleRequest} className="space-y-4" autoComplete="off">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome do workspace</Label>
                  <Input
                    value={reqWorkspaceName}
                    onChange={(e) => setReqWorkspaceName(e.target.value)}
                    placeholder="Bravy"
                    required
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Identificador (URL)</Label>
                  <Input
                    value={reqWorkspaceSlug}
                    onChange={(e) =>
                      setReqWorkspaceSlug(
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                      )
                    }
                    placeholder="bravy"
                    required
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    className="font-mono text-sm"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Seu nome</Label>
                <Input
                  value={reqName}
                  onChange={(e) => setReqName(e.target.value)}
                  placeholder="Tiago Silva"
                  required
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Seu e-mail</Label>
                <Input
                  type="email"
                  value={reqEmail}
                  onChange={(e) => setReqEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Senha (mín. 8 caracteres)</Label>
                <Input
                  type="password"
                  value={reqPassword}
                  onChange={(e) => setReqPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Motivo / contato (opcional)</Label>
                <Textarea
                  rows={2}
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                  placeholder="Pra que vai usar? Quem indicou? Ajuda na aprovação."
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Enviando…' : 'Enviar solicitação'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
