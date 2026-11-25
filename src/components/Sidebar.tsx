import { useState } from 'react';
import {
  Disc3,
  HardDrive,
  Heart,
  Home,
  Library,
  Plus,
  Radio,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useMusicStore } from '@/store/useMusicStore';
import type { ActiveView } from '@/types/music';

export function Sidebar() {
  const activeView = useMusicStore((s) => s.activeView);
  const selectedPlaylistId = useMusicStore((s) => s.selectedPlaylistId);
  const setActiveView = useMusicStore((s) => s.setActiveView);
  const playlists = useMusicStore((s) => s.playlists);
  const createPlaylist = useMusicStore((s) => s.createPlaylist);
  const likedCount = useMusicStore((s) => s.likedTracks.length);
  const localCount = useMusicStore((s) => s.localTracks.length);
  const spotifyProfile = useMusicStore((s) => s.spotifyAuth.profile);
  const spotifyReady = useMusicStore((s) => s.spotifyDeviceReady);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const navItems: { id: ActiveView; label: string; icon: typeof Home; badge?: number }[] = [
    { id: 'home', label: 'Startseite', icon: Home },
    { id: 'search', label: 'Suche & URLs', icon: Search },
    { id: 'library', label: 'Bibliothek', icon: Library },
    { id: 'liked', label: 'Favoriten', icon: Heart, badge: likedCount || undefined },
    { id: 'local', label: 'Lokale Musik', icon: HardDrive, badge: localCount || undefined },
    { id: 'radio', label: 'Live Radio', icon: Radio },
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const pl = createPlaylist(newName.trim());
    setNewName('');
    setCreating(false);
    setActiveView('playlist', pl.id);
  };

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950/95 select-none">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 via-cyan-500 to-violet-500 shadow-lg shadow-emerald-500/20">
          <Disc3 className="h-5 w-5 text-zinc-950 animate-[spin_10s_linear_infinite]" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-white">OmniPlay</h1>
          <p className="text-[11px] text-zinc-500">All-in-One Music</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="space-y-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? 'bg-zinc-800/90 text-white shadow-sm'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${active ? 'text-emerald-400' : ''}`} />
                {item.label}
              </span>
              {item.badge !== undefined && (
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Playlists Section */}
      <div className="mt-5 flex min-h-0 flex-1 flex-col border-t border-zinc-800/70 pt-4 px-3">
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Playlists
          </span>
          <button
            onClick={() => setCreating((c) => !c)}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            title="Neue gemischte Playlist erstellen"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {creating && (
          <form onSubmit={handleCreate} className="mb-2 px-1">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => {
                if (!newName.trim()) setCreating(false);
              }}
              placeholder="Playlist-Name..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
            />
          </form>
        )}

        <div className="flex-1 space-y-0.5 overflow-y-auto pr-1">
          {playlists.map((pl) => {
            const active = activeView === 'playlist' && selectedPlaylistId === pl.id;
            return (
              <button
                key={pl.id}
                onClick={() => setActiveView('playlist', pl.id)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                  active
                    ? 'bg-emerald-500/15 text-emerald-300 font-medium'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <span className="truncate">{pl.name}</span>
                <span className="ml-2 shrink-0 text-[10px] text-zinc-600">{pl.tracks.length}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Status & Settings */}
      <div className="border-t border-zinc-800/70 p-3 space-y-2">
        <button
          onClick={() => setActiveView('settings')}
          className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors ${
            activeView === 'settings'
              ? 'bg-zinc-800 text-white'
              : 'bg-zinc-900/70 text-zinc-300 hover:bg-zinc-800/80'
          }`}
        >
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800">
            {spotifyProfile?.avatar ? (
              <img
                src={spotifyProfile.avatar}
                alt={spotifyProfile.displayName}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <Settings className="h-4 w-4 text-zinc-400" />
            )}
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-zinc-950 ${
                spotifyProfile
                  ? spotifyReady
                    ? 'bg-emerald-400'
                    : 'bg-amber-400'
                  : 'bg-zinc-600'
              }`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium">
              {spotifyProfile ? spotifyProfile.displayName : 'Einstellungen'}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
              {spotifyProfile ? (
                <>
                  <Sparkles className="h-2.5 w-2.5 text-emerald-400" />
                  <span>Spotify {spotifyProfile.product || 'Verbunden'}</span>
                </>
              ) : (
                <span>Spotify & Quellen verbinden</span>
              )}
            </div>
          </div>
        </button>
      </div>
    </aside>
  );
}
