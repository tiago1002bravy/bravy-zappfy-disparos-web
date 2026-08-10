'use client';
import { cn } from '@/lib/utils';

export function StatTile({
  label,
  value,
  sub,
  dotColor,
  valueClassName,
}: {
  label: string;
  value: string;
  sub?: string;
  /** Cor CSS do dot de identidade (ex: 'var(--chart-lead)') */
  dotColor?: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {dotColor && (
          <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: dotColor }} />
        )}
        {label}
      </div>
      <div className={cn('mt-1 text-2xl font-semibold tabular-nums tracking-tight', valueClassName)}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
