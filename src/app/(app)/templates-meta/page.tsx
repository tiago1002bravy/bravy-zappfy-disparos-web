'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Eye, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface WabaTemplate {
  id: string;
  wabaId: string;
  name: string;
  language: string;
  category: string;
  status: string;
  bodyText: string | null;
  variableCount: number;
  headerType: string;
  hasButtons: boolean;
  syncedAt: string;
}

const STATUS_CLASSES: Record<string, string> = {
  APPROVED: 'border-brand/40 text-brand',
  PENDING: 'border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400',
  REJECTED: 'border-red-300 text-red-700 dark:border-red-800 dark:text-red-400',
  PAUSED: 'border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400',
  DISABLED: 'border-border text-muted-foreground',
};

export default function TemplatesMetaPage() {
  const qc = useQueryClient();
  const [preview, setPreview] = useState<WabaTemplate | null>(null);

  const { data: templates = [], isLoading } = useQuery<WabaTemplate[]>({
    queryKey: ['waba-templates'],
    queryFn: async () => (await api.get('/waba-templates')).data,
  });

  const syncTemplates = useMutation({
    mutationFn: async () => (await api.post('/waba-templates/sync')).data,
    onSuccess: (data: { added: number; updated: number }) => {
      toast.success(`Sync concluído: ${data.added} novos, ${data.updated} atualizados`);
      qc.invalidateQueries({ queryKey: ['waba-templates'] });
    },
    onError: (err: unknown) => {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(typeof m === 'string' ? m : 'Falha no sync de templates');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Templates Meta</h1>
          <p className="text-sm text-muted-foreground">
            Espelho dos templates da WABA. Criação e aprovação acontecem no Business Manager.
          </p>
        </div>
        <Button size="sm" onClick={() => syncTemplates.mutate()} disabled={syncTemplates.isPending}>
          <RefreshCw className={cn('mr-1.5 size-4', syncTemplates.isPending && 'animate-spin')} />
          Sincronizar
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Nome</TableHead>
              <TableHead>Idioma</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Variáveis</TableHead>
              <TableHead>Header</TableHead>
              <TableHead>Sync</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && templates.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Nenhum template sincronizado. Cadastre uma instância Cloud API em Settings e clique em
                  Sincronizar.
                </TableCell>
              </TableRow>
            )}
            {templates.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-xs font-medium">{t.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{t.language}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{t.category}</TableCell>
                <TableCell>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium',
                      STATUS_CLASSES[t.status] ?? 'border-border text-muted-foreground',
                    )}
                  >
                    {t.status}
                  </span>
                </TableCell>
                <TableCell className="text-center text-xs tabular-nums">{t.variableCount}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {t.headerType === 'NONE' ? '—' : t.headerType}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                  {format(new Date(t.syncedAt), 'dd/MM HH:mm')}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => setPreview(t)} title="Preview">
                    <Eye className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">{preview?.name}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-3 text-sm">
              <div className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3">
                {preview.bodyText ?? <span className="text-muted-foreground">Sem corpo de texto</span>}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>Idioma: {preview.language}</span>
                <span>Categoria: {preview.category}</span>
                <span>{preview.variableCount} variáveis</span>
                {preview.headerType !== 'NONE' && <span>Header: {preview.headerType}</span>}
                {preview.hasButtons && <span>Com botões</span>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
