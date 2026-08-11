'use client';
import { cn } from '@/lib/utils';

export type MeterTone = 'brand' | 'warn' | 'danger';

const FILL: Record<MeterTone, string> = {
  brand: 'bg-brand',
  warn: 'bg-amber-500',
  danger: 'bg-red-500',
};

/**
 * Medidor simples div-based. O wrapper ui/progress (Base UI) aplica classes no
 * Track e o Root colapsa pra 0px dentro de flex — aqui o controle é direto.
 */
export function Meter({
  pct,
  tone = 'brand',
  className,
  title,
}: {
  pct: number;
  tone?: MeterTone;
  className?: string;
  title?: string;
}) {
  const clamped = Math.max(0, Math.min(pct, 100));
  return (
    <div
      className={cn('h-3 w-full overflow-hidden rounded-md bg-muted', className)}
      title={title}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-md transition-[width] duration-300', FILL[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
