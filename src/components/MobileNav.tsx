import { Home, Library, Radio, Search, Settings } from 'lucide-react';
import { useMusicStore } from '@/store/useMusicStore';
import type { ActiveView } from '@/types/music';

export function MobileNav() {
  const activeView = useMusicStore((s) => s.activeView);
  const setActiveView = useMusicStore((s) => s.setActiveView);

  const items: { id: ActiveView; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Suche', icon: Search },
    { id: 'library', label: 'Mediathek', icon: Library },
    { id: 'radio', label: 'Radio', icon: Radio },
    { id: 'settings', label: 'Setup', icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 flex h-16 items-center justify-around border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl pb-safe">
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 text-[10px] font-medium transition-colors ${
              active ? 'text-emerald-400' : 'text-zinc-500'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
