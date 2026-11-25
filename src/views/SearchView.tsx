import { useEffect, useRef, useState } from 'react';
import { Loader2, Play, Search, Sparkles, X } from 'lucide-react';
import type { SourceType, Track } from '@/types/music';
import { useMusicStore } from '@/store/useMusicStore';
import { unifiedSearch, type UnifiedSearchResult } from '@/services/search';
import { TrackRow } from '@/components/TrackRow';
import { SourceBadge } from '@/components/SourceBadge';

const ALL_SOURCES: { id: SourceType; label: string }[] = [
  { id: 'spotify', label: 'Spotify' },
  { id: 'youtube', label: 'YouTube Music' },
  { id: 'soundcloud', label: 'SoundCloud' },
  { id: 'local', label: 'Lokal' },
  { id: 'radio', label: 'Radio' },
];

export function SearchView() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeSources, setActiveSources] = useState<SourceType[]>([
    'spotify',
    'youtube',
    'soundcloud',
    'local',
    'radio',
  ]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UnifiedSearchResult | null>(null);

  const getValidSpotifyToken = useMusicStore((s) => s.getValidSpotifyToken);
  const spotifyLoggedIn = useMusicStore((s) => Boolean(s.spotifyAuth.accessToken));
  const youtubeApiKey = useMusicStore((s) => s.settings.youtubeApiKey);
  const localTracks = useMusicStore((s) => s.localTracks);
  const radioStations = useMusicStore((s) => s.radioStations);
  const playTrack = useMusicStore((s) => s.playTrack);
  const setActiveView = useMusicStore((s) => s.setActiveView);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const toggleSource = (src: SourceType) => {
    setActiveSources((prev) =>
      prev.includes(src)
        ? prev.length > 1
          ? prev.filter((s) => s !== src)
          : prev
        : [...prev, src]
    );
  };

  const runSearch = async (q = query) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const token = await getValidSpotifyToken();
      const res = await unifiedSearch({
        query: trimmed,
        sources: activeSources,
        spotifyAccessToken: token,
        youtubeApiKey,
        localTracks,
        radioStations,
      });
      setResults(res);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runSearch();
  };

  const sections: { key: SourceType; title: string; tracks: Track[] }[] = results
    ? [
        { key: 'spotify', title: 'Spotify Premium', tracks: results.spotify },
        { key: 'youtube', title: 'YouTube & YouTube Music', tracks: results.youtube },
        { key: 'soundcloud', title: 'SoundCloud', tracks: results.soundcloud },
        { key: 'local', title: 'Lokale Dateien', tracks: results.local },
        { key: 'radio', title: 'Live Radio', tracks: results.radio },
      ]
    : [];

  const totalCount = sections.reduce((sum, s) => sum + s.tracks.length, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Search Bar */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Song, Künstler suchen oder Spotify / YouTube / SoundCloud Link einfügen..."
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 py-3.5 pl-12 pr-10 text-sm sm:text-base text-white placeholder-zinc-500 outline-none focus:border-emerald-500 transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResults(null);
                  inputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-emerald-500 px-5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Suchen'}
          </button>
        </div>

        {/* Source Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {ALL_SOURCES.map((src) => {
            const enabled = activeSources.includes(src.id);
            return (
              <button
                key={src.id}
                type="button"
                onClick={() => toggleSource(src.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  enabled
                    ? 'border-zinc-600 bg-zinc-800 text-white'
                    : 'border-zinc-800/70 bg-zinc-950 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {src.label}
              </button>
            );
          })}

          {!spotifyLoggedIn && (
            <button
              type="button"
              onClick={() => setActiveView('settings')}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/20"
            >
              <Sparkles className="h-3 w-3" />
              Spotify für Spotify-Suche verbinden
            </button>
          )}
        </div>
      </form>

      {/* Direct Resolved URL Card */}
      {results?.resolvedUrlTrack && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
              Direkt-Link erkannt
            </span>
            <SourceBadge source={results.resolvedUrlTrack.source} />
          </div>
          <TrackRow track={results.resolvedUrlTrack} />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-400">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <p className="text-sm">Durchsuche ausgewählte Plattformen parallel...</p>
        </div>
      )}

      {/* Results Grouped by Platform */}
      {!loading && results && !results.resolvedUrlTrack && (
        <div className="space-y-8">
          {totalCount === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center">
              <p className="text-sm font-medium text-zinc-300">Keine Ergebnisse gefunden.</p>
              <p className="mt-1 text-xs text-zinc-500">
                Tipp: Du kannst auch direkt eine YouTube-, Spotify- oder SoundCloud-URL einfügen!
              </p>
            </div>
          ) : (
            sections
              .filter((s) => s.tracks.length > 0)
              .map((section) => (
                <section key={section.key} className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-white">{section.title}</h3>
                      <SourceBadge source={section.key} compact />
                      <span className="text-xs text-zinc-500">({section.tracks.length})</span>
                    </div>
                    <button
                      onClick={() => void playTrack(section.tracks[0], section.tracks)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      Alle abspielen
                    </button>
                  </div>
                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-2">
                    {section.tracks.map((track, idx) => (
                      <TrackRow
                        key={track.id}
                        track={track}
                        index={idx}
                        contextQueue={section.tracks}
                      />
                    ))}
                  </div>
                </section>
              ))
          )}
        </div>
      )}

      {/* Empty Hint */}
      {!loading && !results && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-4">
          {[
            {
              title: 'Plattformübergreifend suchen',
              desc: 'Suche gleichzeitig auf Spotify Premium, YouTube Music, SoundCloud und lokal.',
              queries: ['Daft Punk', 'Fred again', 'Lofi Beats'],
            },
            {
              title: 'Direkte Links abspielen',
              desc: 'Füge einfach einen Spotify-, YouTube- oder SoundCloud-Track-Link ein.',
              queries: ['Synthwave', 'Techno Mix', 'Hans Zimmer'],
            },
            {
              title: 'Gemischte Playlists',
              desc: 'Klicke bei jedem Suchergebnis auf +, um Songs verschiedener Anbieter zu mischen.',
              queries: ['Chillhop', 'Acoustic Covers', 'Phonk'],
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5"
            >
              <h4 className="font-semibold text-white">{card.title}</h4>
              <p className="mt-1.5 text-xs text-zinc-400">{card.desc}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {card.queries.map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setQuery(q);
                      void runSearch(q);
                    }}
                    className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
