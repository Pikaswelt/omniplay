import { useState } from 'react';
import { Disc3, Heart, Loader2, Play, RefreshCw, Shuffle } from 'lucide-react';
import { useMusicStore } from '@/store/useMusicStore';
import { fetchSpotifyPlaylistTracks } from '@/services/spotify';
import { TrackRow } from '@/components/TrackRow';
import { SourceBadge } from '@/components/SourceBadge';
import type { SourceType } from '@/types/music';

interface PlaylistDetailViewProps {
  mode: 'playlist' | 'liked';
}

export function PlaylistDetailView({ mode }: PlaylistDetailViewProps) {
  const [loadingSpotify, setLoadingSpotify] = useState(false);

  const selectedPlaylistId = useMusicStore((s) => s.selectedPlaylistId);
  const playlist = useMusicStore((s) =>
    mode === 'playlist' ? s.playlists.find((p) => p.id === selectedPlaylistId) : undefined
  );
  const likedTracks = useMusicStore((s) => s.likedTracks);
  const playTrack = useMusicStore((s) => s.playTrack);
  const toggleShuffle = useMusicStore((s) => s.toggleShuffle);
  const shuffle = useMusicStore((s) => s.shuffle);
  const removeTrackFromPlaylist = useMusicStore((s) => s.removeTrackFromPlaylist);
  const importPlaylists = useMusicStore((s) => s.importPlaylists);
  const getValidSpotifyToken = useMusicStore((s) => s.getValidSpotifyToken);
  const showToast = useMusicStore((s) => s.showToast);

  const tracks = mode === 'liked' ? likedTracks : playlist?.tracks ?? [];
  const title = mode === 'liked' ? 'Lieblingssongs' : playlist?.name ?? 'Playlist';
  const description =
    mode === 'liked'
      ? 'Alle deine Favoriten über Spotify, YouTube, SoundCloud & Lokal hinweg.'
      : playlist?.description;

  const uniqueSources = Array.from(new Set(tracks.map((t) => t.source))) as SourceType[];

  const handlePlayAll = (withShuffle = false) => {
    if (tracks.length === 0) return;
    if (withShuffle && !shuffle) toggleShuffle();
    const startIdx = withShuffle ? Math.floor(Math.random() * tracks.length) : 0;
    void playTrack(tracks[startIdx], tracks);
  };

  const handleRefreshSpotifyPlaylist = async () => {
    if (!playlist?.spotifyPlaylistId) return;
    const token = await getValidSpotifyToken();
    if (!token) {
      showToast('Bitte zuerst mit Spotify verbinden.');
      return;
    }
    setLoadingSpotify(true);
    try {
      const freshTracks = await fetchSpotifyPlaylistTracks(token, playlist.spotifyPlaylistId);
      importPlaylists([{ ...playlist, tracks: freshTracks, updatedAt: Date.now() }]);
      showToast(`${freshTracks.length} Tracks von Spotify aktualisiert.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoadingSpotify(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-5 rounded-3xl border border-zinc-800/80 bg-gradient-to-br from-emerald-500/15 via-zinc-900 to-zinc-950 p-6 sm:flex-row sm:items-end">
        <div className="h-36 w-36 shrink-0 overflow-hidden rounded-2xl bg-zinc-800 shadow-2xl">
          {mode === 'liked' ? (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500 to-cyan-500 text-zinc-950">
              <Heart className="h-16 w-16 fill-current" />
            </div>
          ) : playlist?.cover || tracks[0]?.artwork ? (
            <img
              src={playlist?.cover || tracks[0]?.artwork}
              alt={title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-600">
              <Disc3 className="h-14 w-14" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            {mode === 'liked' ? 'Favoriten' : 'Unified Playlist'}
          </div>
          <h2 className="truncate text-2xl sm:text-4xl font-extrabold text-white">{title}</h2>
          {description && <p className="text-sm text-zinc-400">{description}</p>}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-zinc-400">{tracks.length} Titel</span>
            {uniqueSources.map((s) => (
              <SourceBadge key={s} source={s} compact />
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => handlePlayAll(false)}
          disabled={tracks.length === 0}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-zinc-950 shadow-lg hover:bg-emerald-400 disabled:opacity-40 transition-colors"
        >
          <Play className="h-4 w-4 fill-current" />
          Abspielen
        </button>

        <button
          onClick={() => handlePlayAll(true)}
          disabled={tracks.length === 0}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors"
        >
          <Shuffle className="h-4 w-4" />
          Shuffle
        </button>

        {playlist?.spotifyPlaylistId && (
          <button
            onClick={() => void handleRefreshSpotifyPlaylist()}
            disabled={loadingSpotify}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
          >
            {loadingSpotify ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Tracks von Spotify laden
          </button>
        )}
      </div>

      {/* Track List */}
      {tracks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-sm text-zinc-500">
          Noch keine Titel in dieser Liste. Nutze die Suche, um Songs von Spotify, YouTube oder
          SoundCloud mit „+“ hinzuzufügen!
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-2">
          {tracks.map((track, idx) => (
            <TrackRow
              key={`${track.id}-${idx}`}
              track={track}
              index={idx}
              contextQueue={tracks}
              onRemove={
                mode === 'playlist' && playlist
                  ? () => removeTrackFromPlaylist(playlist.id, track.id)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
