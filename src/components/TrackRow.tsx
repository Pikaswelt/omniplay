import { useState } from 'react';
import { Heart, ListPlus, Music2, Pause, Play, Plus, Trash2 } from 'lucide-react';
import type { Track } from '@/types/music';
import { useMusicStore } from '@/store/useMusicStore';
import { formatTime } from '@/utils/format';
import { SourceBadge } from './SourceBadge';

interface TrackRowProps {
  track: Track;
  index?: number;
  contextQueue?: Track[];
  onRemove?: () => void;
}

export function TrackRow({ track, index, contextQueue, onRemove }: TrackRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const currentTrackId = useMusicStore((s) => s.currentTrack?.id);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const playTrack = useMusicStore((s) => s.playTrack);
  const togglePlayPause = useMusicStore((s) => s.togglePlayPause);
  const toggleLike = useMusicStore((s) => s.toggleLike);
  const liked = useMusicStore((s) => s.likedTracks.some((t) => t.id === track.id));
  const addToQueue = useMusicStore((s) => s.addToQueue);
  const playlists = useMusicStore((s) => s.playlists);
  const addTrackToPlaylist = useMusicStore((s) => s.addTrackToPlaylist);

  const isCurrent = currentTrackId === track.id;

  const handlePlay = () => {
    if (isCurrent) {
      void togglePlayPause();
    } else {
      void playTrack(track, contextQueue);
    }
  };

  return (
    <div
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
        isCurrent
          ? 'bg-emerald-500/10 text-emerald-300'
          : 'hover:bg-zinc-800/60 text-zinc-200'
      }`}
    >
      {/* Index / Play button */}
      <button
        onClick={handlePlay}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:text-white"
        title={isCurrent && isPlaying ? 'Pause' : 'Abspielen'}
      >
        {isCurrent && isPlaying ? (
          <>
            <div className="flex items-end gap-[2px] h-3.5 group-hover:hidden">
              <span className="w-[3px] h-full bg-emerald-400 rounded-full eq-bar-1 origin-bottom" />
              <span className="w-[3px] h-full bg-emerald-400 rounded-full eq-bar-2 origin-bottom" />
              <span className="w-[3px] h-full bg-emerald-400 rounded-full eq-bar-3 origin-bottom" />
            </div>
            <Pause className="hidden h-4 w-4 fill-current group-hover:block text-emerald-400" />
          </>
        ) : (
          <>
            {typeof index === 'number' ? (
              <span className="text-xs font-mono text-zinc-500 group-hover:hidden">
                {index + 1}
              </span>
            ) : null}
            <Play
              className={`h-4 w-4 fill-current ${
                typeof index === 'number' ? 'hidden group-hover:block' : ''
              } ${isCurrent ? 'text-emerald-400' : 'text-white'}`}
            />
          </>
        )}
      </button>

      {/* Artwork */}
      <div
        onClick={handlePlay}
        className="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-zinc-800"
      >
        {track.artwork ? (
          <img
            src={track.artwork}
            alt={track.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-500">
            <Music2 className="h-5 w-5" />
          </div>
        )}
      </div>

      {/* Title & Artist */}
      <div onClick={handlePlay} className="min-w-0 flex-1 cursor-pointer">
        <div
          className={`truncate text-sm font-medium ${
            isCurrent ? 'text-emerald-400' : 'text-zinc-100'
          }`}
        >
          {track.title}
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="truncate">{track.artist}</span>
          {track.album && (
            <>
              <span className="hidden sm:inline text-zinc-600">•</span>
              <span className="hidden sm:inline truncate text-zinc-500">{track.album}</span>
            </>
          )}
        </div>
      </div>

      {/* Source Badge */}
      <div className="hidden sm:block shrink-0">
        <SourceBadge source={track.source} compact />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => toggleLike(track)}
          className={`rounded-lg p-1.5 transition-colors ${
            liked
              ? 'text-emerald-400 hover:text-emerald-300'
              : 'text-zinc-500 opacity-70 hover:opacity-100 hover:text-zinc-200'
          }`}
          title={liked ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
        >
          <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
        </button>

        <button
          onClick={() => addToQueue(track)}
          className="rounded-lg p-1.5 text-zinc-500 opacity-70 hover:opacity-100 hover:text-zinc-200 transition-colors"
          title="Zur Warteschlange hinzufügen"
        >
          <ListPlus className="h-4 w-4" />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-lg p-1.5 text-zinc-500 opacity-70 hover:opacity-100 hover:text-zinc-200 transition-colors"
            title="Zu Playlist hinzufügen"
          >
            <Plus className="h-4 w-4" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-9 z-40 w-52 rounded-xl border border-zinc-800 bg-zinc-900/95 p-1.5 shadow-2xl backdrop-blur-xl">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Zu Playlist hinzufügen
                </div>
                {playlists.length === 0 ? (
                  <div className="px-2.5 py-2 text-xs text-zinc-500">
                    Noch keine Playlists
                  </div>
                ) : (
                  playlists.map((pl) => (
                    <button
                      key={pl.id}
                      onClick={() => {
                        addTrackToPlaylist(pl.id, track);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800"
                    >
                      <span className="truncate">{pl.name}</span>
                      <span className="ml-2 text-[10px] text-zinc-500">{pl.tracks.length}</span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {onRemove && (
          <button
            onClick={onRemove}
            className="rounded-lg p-1.5 text-zinc-500 hover:text-rose-400 transition-colors"
            title="Entfernen"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}

        <span className="hidden md:block w-11 text-right text-xs font-mono text-zinc-500">
          {track.source === 'radio' ? 'LIVE' : track.duration > 0 ? formatTime(track.duration) : '—'}
        </span>
      </div>
    </div>
  );
}
