import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Zap } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011/api/v1';
// API publica fica fora do prefixo /api/v1 — montamos a base publica do API
const API_PUBLIC_BASE = API_BASE.replace(/\/api\/v1\/?$/, '');

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function GroupRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const h = await headers();
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || h.get('x-real-ip') || '';
  const ua = h.get('user-agent') ?? '';

  let inviteUrl: string | null = null;
  let reason: string | null = null;

  try {
    const res = await fetch(`${API_PUBLIC_BASE}/g/${encodeURIComponent(slug)}`, {
      method: 'GET',
      headers: {
        ...(ip ? { 'x-forwarded-for': ip } : {}),
        ...(ua ? { 'user-agent': ua } : {}),
      },
      redirect: 'manual',
      cache: 'no-store',
    });
    if (res.status === 302 || res.status === 301) {
      inviteUrl = res.headers.get('location');
    } else if (res.status === 404) {
      reason = 'not-found';
    } else {
      reason = 'unavailable';
    }
  } catch {
    reason = 'unavailable';
  }

  if (inviteUrl) {
    redirect(inviteUrl);
  }

  return <FallbackPage reason={reason ?? 'unavailable'} slug={slug} />;
}

function FallbackPage({ reason, slug }: { reason: string; slug: string }) {
  const isNotFound = reason === 'not-found';
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(50% 40% at 50% 0%, color-mix(in oklch, var(--brand) 20%, transparent) 0%, transparent 70%)',
        }}
      />
      <div className="max-w-md w-full text-center space-y-5">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-[0_0_30px_-4px_var(--brand)]">
          <Zap className="size-6 fill-current" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isNotFound ? 'Link não encontrado' : 'Sem grupo disponível'}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isNotFound
              ? `O link "/${slug}" não existe ou está inativo.`
              : 'Todos os grupos estão lotados no momento. Tente novamente em alguns minutos — abriremos vaga em breve.'}
          </p>
        </div>
      </div>
    </div>
  );
}
