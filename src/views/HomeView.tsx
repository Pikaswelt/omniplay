import { useState } from 'react';
import {
  ArrowRight,
  Disc3,
  Heart,
  Link2,
  Loader2,
  Play,
  Radio,
  Search,
  Sparkles,
} from 'lucide-react';
import { useMusicStore } from '@/store/useMusicStore';
import { resolveDirectUrlOrQuery } from '@/services/search';
import { TrackRow } from '@/components/TrackRow';
import { SourceBadge } from '@/components/SourceBadge';

export function HomeView() {
  const [quickUrl, setQuickUrl] = useState('');
  const [resolving, setResolving] = useState(false);

  const playlists = useMusicStore((s) => s.playlists);
  const recentTracks = useMusicStore((s) => s.recentTracks);
  const radioStations = useMusicStore((s) => s.radioStations);
  const likedTracks = useMusicStore((s) => s.likedTracks);
  const spotifyProfile = useMusicStore((s) => s.spotifyAuth.profile);
  const getValidSpotifyToken = useMusicStore((s) => s.getValidSpotifyToken);
  const playTrack = useMusicStore((s) => s.playTrack);
  const setActiveView = useMusicStore((s) => s.setActiveView);
  const showToast = useMusicStore((s) => s.showToast);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Guten Morgen';
    if (h < 18) return 'Guten Tag';
    return 'Guten Abend';
  })();

  const handleQuickPlayUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickUrl.trim();
    if (!trimmed) return;
    setResolving(true);
    try {
      const token = await getValidSpotifyToken();
      const track = await resolveDirectUrlOrQuery(trimmed, token);
      if (track) {
        setQuickUrl('');
        await playTrack(track);
      } else {
        showToast('Link nicht erkannt — nutze die Suche für Textanfragen.');
      }
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-gradient-to-br from-emerald-500/15 via-zinc-900 to-violet-500/15 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              Spotify Premium • YouTube Music • SoundCloud • Lokal
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {greeting}
              {spotifyProfile ? `, ${spotifyProfile.displayName}` : ''}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Alle deine Musikquellen in einer schnellen App — mische Playlists plattformübergreifend.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setActiveView('search')}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg hover:bg-zinc-200 transition-colors"
            >
              <Search className="h-4 w-4" />
              Überall suchen
            </button>
            {!spotifyProfile && (
              <button
                onClick={() => setActiveView('settings')}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/25 transition-colors"
              >
                Spotify Premium verbinden
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Direct Link Bar */}
        <form onSubmit={handleQuickPlayUrl} className="relative z-10 mt-6 flex gap-2">
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={quickUrl}
              onChange={(e) => setQuickUrl(e.target.value)}
              placeholder="Spotify-, YouTube-, SoundCloud- oder MP3-Link einfügen und sofort abspielen..."
              className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={resolving || !quickUrl.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 transition-colors"
          >
            {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
            <span className="hidden sm:inline">Abspielen</span>
          </button>
        </form>
      </section>

      {/* Quick Access Grid */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Schnellzugriff</h3>
          <button
            onClick={() => setActiveView('library')}
            className="text-xs font-medium text-zinc-400 hover:text-white"
          >
            Alle anzeigen
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Liked Songs Card */}
          <button
            onClick={() => setActiveView('liked')}
            className="group flex items-center gap-3.5 rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-3 text-left hover:bg-zinc-800/80 transition-all"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-zinc-950 shadow-lg">
              <Heart className="h-6 w-6 fill-current" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">Lieblingssongs</div>
              <div className="text-xs text-zinc-400">{likedTracks.length} Titel gespeichert</div>
            </div>
          </button>

          {/* Playlists */}
          {playlists.slice(0, 5).map((pl) => (
            <div
              key={pl.id}
              onClick={() => setActiveView('playlist', pl.id)}
              className="group flex cursor-pointer items-center gap-3.5 rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-3 hover:bg-zinc-800/80 transition-all"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
                {pl.cover || pl.tracks[0]?.artwork ? (
                  <img
                    src={pl.cover || pl.tracks[0]?.artwork}
                    alt={pl.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-500">
                    <Disc3 className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{pl.name}</div>
                <div className="text-xs text-zinc-400">{pl.tracks.length} Titel</div>
              </div>
              {pl.tracks[0] && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void playTrack(pl.tracks[0], pl.tracks);
                  }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-zinc-950 opacity-0 shadow-lg transition-all group-hover:opacity-100 hover:scale-105"
                  title="Playlist abspielen"
                >
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Instant Live Radio */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <Radio className="h-4 w-4 text-cyan-400" />
            Sofort loshören (Live Radio)
          </h3>
          <button
            onClick={() => setActiveView('radio')}
            className="text-xs font-medium text-zinc-400 hover:text-white"
          >
            Alle Sender
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {radioStations.slice(0, 5).map((station) => (
            <button
              key={station.id}
              onClick={() => void playTrack(station, radioStations)}
              className="group flex flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3 text-left hover:bg-zinc-800/80 transition-all"
            >
              <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-xl bg-zinc-800">
                {station.artwork && (
                  <img
                    src={station.artwork}
                    alt={station.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
                <div className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-zinc-950 opacity-0 shadow-xl transition-all group-hover:opacity-100 translate-y-1 group-hover:translate-y-0">
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                </div>
              </div>
              <div className="truncate text-sm font-semibold text-white">{station.title}</div>
              <div className="mt-0.5 truncate text-xs text-zinc-400">{station.artist}</div>
              <div className="mt-2">
                <SourceBadge source="radio" compact />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Recently Played */}
      {recentTracks.length > 0 && (
        <section>
          <h3 className="mb-3 text-lg font-bold text-white">Zuletzt gehört</h3>
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-2">
            {recentTracks.slice(0, 8).map((track, idx) => (
              <TrackRow
                key={`${track.id}-${idx}`}
                track={track}
                index={idx}
                contextQueue={recentTracks}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
