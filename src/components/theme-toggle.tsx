'use client';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from './theme-provider';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  variant?: 'sidebar' | 'ghost';
};

export function ThemeToggle({ className, variant = 'ghost' }: Props) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
      className={cn(
        'inline-flex items-center gap-2 rounded-md text-sm transition-colors',
        variant === 'sidebar'
          ? 'w-full px-3 py-2 text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
          : 'h-9 w-9 justify-center border border-border bg-background hover:bg-muted',
        className,
      )}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      {variant === 'sidebar' && (
        <span className="truncate">{isDark ? 'Tema claro' : 'Tema escuro'}</span>
      )}
    </button>
  );
}
