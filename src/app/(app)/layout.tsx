'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Users,
  MessageSquare,
  CalendarClock,
  Calendar,
  ImageIcon,
  Settings,
  LogOut,
  Tags,
  Link2,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';

const NAV_SECTIONS = [
  {
    label: 'Cadastros',
    items: [
      { href: '/grupos', label: 'Grupos', icon: Users },
      { href: '/group-lists', label: 'Listas de grupos', icon: Tags },
      { href: '/shortlinks', label: 'Shortlinks', icon: Link2 },
      { href: '/mensagens', label: 'Mensagens', icon: MessageSquare },
      { href: '/midias', label: 'Mídias', icon: ImageIcon },
    ],
  },
  {
    label: 'Disparos',
    items: [
      { href: '/agendamentos', label: 'Agendamentos', icon: CalendarClock },
      { href: '/calendario', label: 'Calendário', icon: Calendar },
    ],
  },
  {
    label: 'Manutenção',
    items: [{ href: '/group-updates', label: 'Atualizar grupos', icon: Users }],
  },
  {
    label: 'Sistema',
    items: [{ href: '/settings', label: 'Settings', icon: Settings }],
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = typeof window !== 'undefined' && localStorage.getItem('zd_access_token');
    if (!t) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  function logout() {
    localStorage.removeItem('zd_access_token');
    localStorage.removeItem('zd_refresh_token');
    router.replace('/login');
  }

  if (!ready) return null;

  return (
    <div className="flex flex-1">
      <aside className="w-56 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-[0_0_20px_-4px_var(--brand)]">
              <Zap className="size-4 fill-current" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight leading-none">Zappfy</div>
              <div className="text-[11px] text-sidebar-foreground/60 mt-1">Disparos</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto pl-2 pr-1 py-4 flex flex-col gap-5">
          {NAV_SECTIONS.map((section, sIdx) => (
            <div key={section.label} className="flex flex-col gap-1">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {section.label}
              </div>
              {section.items.map((n) => {
                const Icon = n.icon;
                const active = path?.startsWith(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={cn(
                      'group relative flex items-center gap-2.5 pl-3 pr-3 py-2 rounded-md text-sm transition-colors',
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                        : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full transition-colors',
                        active ? 'bg-brand' : 'bg-transparent',
                      )}
                    />
                    <Icon
                      className={cn(
                        'size-4 shrink-0',
                        active
                          ? 'text-brand'
                          : 'text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground',
                      )}
                    />
                    <span className="truncate">{n.label}</span>
                  </Link>
                );
              })}
              {sIdx < NAV_SECTIONS.length - 1 && (
                <div className="mx-3 mt-3 border-t border-sidebar-border" />
              )}
            </div>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3 flex flex-col gap-1">
          <ThemeToggle variant="sidebar" />
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut className="size-4" />
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto pl-3 pr-10 py-6">{children}</main>
    </div>
  );
}
