'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';

const SS_KEY = 'zd_instance_creds';

export interface InstanceCreds {
  instanceName: string;
  instanceToken: string;
  /** quando true, usa a conexão padrão da conta — não precisa enviar token */
  useAccountDefault?: boolean;
}

interface Props {
  value: InstanceCreds;
  onChange: (v: InstanceCreds) => void;
}

interface AccountDefaults {
  hasInstance: boolean;
  instanceName: string | null;
}

export function InstanceCredentialsField({ value, onChange }: Props) {
  const [remember, setRemember] = useState(false);

  const { data: defaults } = useQuery<AccountDefaults>({
    queryKey: ['tenant-defaults'],
    queryFn: async () => (await api.get('/tenant/defaults')).data,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Se há default na conta e ainda não escolheu nada, usa default
    if (defaults?.hasInstance && !value.instanceName && !value.instanceToken && !value.useAccountDefault) {
      onChange({ instanceName: defaults.instanceName ?? '', instanceToken: '', useAccountDefault: true });
      return;
    }
    const stored = sessionStorage.getItem(SS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as InstanceCreds;
        if (parsed.instanceName && parsed.instanceToken) {
          onChange(parsed);
          setRemember(true);
        }
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaults?.hasInstance]);

  function update(next: InstanceCreds, rememberFlag = remember) {
    onChange(next);
    if (rememberFlag) {
      sessionStorage.setItem(SS_KEY, JSON.stringify(next));
    } else {
      sessionStorage.removeItem(SS_KEY);
    }
  }

  if (defaults?.hasInstance && value.useAccountDefault !== false) {
    return (
      <div className="space-y-3 rounded-md border p-4 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
        <div className="text-sm font-medium flex items-center justify-between">
          <span>✓ Usando conexão padrão da conta</span>
          <button
            type="button"
            onClick={() => onChange({ instanceName: '', instanceToken: '', useAccountDefault: false })}
            className="text-xs text-zinc-600 underline"
          >
            usar outra
          </button>
        </div>
        <div className="text-xs text-zinc-600">
          Instância: <code className="font-mono">{defaults.instanceName}</code>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border p-4 bg-zinc-50 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Instância Uazapi</div>
        {defaults?.hasInstance && (
          <button
            type="button"
            onClick={() =>
              onChange({ instanceName: defaults.instanceName ?? '', instanceToken: '', useAccountDefault: true })
            }
            className="text-xs text-blue-600 underline"
          >
            usar conexão padrão
          </button>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="instanceName">Nome da instância</Label>
        <Input
          id="instanceName"
          value={value.instanceName}
          onChange={(e) => update({ ...value, instanceName: e.target.value, useAccountDefault: false })}
          placeholder="ex: bravy-marketing"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="instanceToken">Token</Label>
        <Input
          id="instanceToken"
          type="password"
          value={value.instanceToken}
          onChange={(e) => update({ ...value, instanceToken: e.target.value, useAccountDefault: false })}
          placeholder="cole o token Uazapi"
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="remember"
          checked={remember}
          onCheckedChange={(v) => {
            setRemember(v);
            update(value, v);
          }}
        />
        <Label htmlFor="remember" className="text-xs text-zinc-600">
          Lembrar nesta sessão (sessionStorage, sai ao fechar a aba)
        </Label>
      </div>
    </div>
  );
}
