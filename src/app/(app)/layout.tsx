'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Users, MessageSquare, CalendarClock, Calendar, ImageIcon, Settings, LogOut, Tags, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/grupos', label: 'Grupos', icon: Users },
  { href: '/group-lists', label: 'Listas de grupos', icon: Tags },
  { href: '/shortlinks', label: 'Shortlinks', icon: Link2 },
  { href: '/mensagens', label: 'Mensagens', icon: MessageSquare },
  { href: '/midias', label: 'Mídias', icon: ImageIcon },
  { href: '/agendamentos', label: 'Agendamentos', icon: CalendarClock },
  { href: '/calendario', label: 'Calendário', icon: Calendar },
  { href: '/group-updates', label: 'Atualizar grupos', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
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
      <aside className="w-64 border-r bg-zinc-50 dark:bg-zinc-900 p-4 flex flex-col gap-2">
        <div className="px-2 py-3 text-lg font-semibold">Zappfy Disparos</div>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = path?.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors',
                  active
                    ? 'bg-zinc-200 dark:bg-zinc-800 font-medium'
                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-800',
                )}
              >
                <Icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="mt-auto flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <LogOut className="size-4" />
          Sair
        </button>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
