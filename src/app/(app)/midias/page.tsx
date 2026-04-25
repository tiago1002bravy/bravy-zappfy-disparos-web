'use client';
import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Trash2, Upload } from 'lucide-react';

interface Media {
  id: string;
  s3Key: string;
  mime: string;
  size: number;
  url: string;
  thumbUrl: string | null;
  createdAt: string;
}

export default function MidiasPage() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: items = [] } = useQuery<Media[]>({
    queryKey: ['media'],
    queryFn: async () => (await api.get('/media')).data,
  });

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post('/media', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Mídia enviada');
      qc.invalidateQueries({ queryKey: ['media'] });
    } catch {
      toast.error('Falha no upload');
    } finally {
      setUploading(false);
    }
  }

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/media/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media'] }),
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mídias</h1>
          <p className="text-sm text-zinc-500">Imagens, vídeos, áudios e PDFs reutilizáveis</p>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
            <Upload className="size-4 mr-2" />
            {uploading ? 'Enviando...' : 'Enviar arquivo'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((m) => (
          <Card key={m.id}>
            <CardContent className="p-3 space-y-2">
              {m.mime.startsWith('image/') && (m.thumbUrl || m.url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.thumbUrl ?? m.url}
                  alt=""
                  className="w-full h-32 object-cover rounded"
                />
              ) : (
                <div className="w-full h-32 bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-center text-xs">
                  {m.mime}
                </div>
              )}
              <div className="text-xs text-zinc-500 truncate">{m.s3Key.split('/').pop()}</div>
              <div className="flex items-center justify-between text-xs">
                <span>{(m.size / 1024).toFixed(0)} KB</span>
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(m.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && (
          <div className="col-span-full text-center text-sm text-zinc-500 py-12">
            Nenhuma mídia. Envie um arquivo pra começar.
          </div>
        )}
      </div>
    </div>
  );
}
