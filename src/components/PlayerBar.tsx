import {
  ChevronUp,
  Heart,
  ListMusic,
  Loader2,
  Music2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useMusicStore } from '@/store/useMusicStore';
import { formatTime } from '@/utils/format';
import { SourceBadge } from './SourceBadge';

export function PlayerBar() {
  const currentTrack = useMusicStore((s) => s.currentTrack);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const isLoading = useMusicStore((s) => s.isLoading);
  const position = useMusicStore((s) => s.position);
  const duration = useMusicStore((s) => s.duration);
  const volume = useMusicStore((s) => s.volume);
  const isMuted = useMusicStore((s) => s.isMuted);
  const shuffle = useMusicStore((s) => s.shuffle);
  const repeat = useMusicStore((s) => s.repeat);
  const activeEngine = useMusicStore((s) => s.activeEngine);
  const showQueuePanel = useMusicStore((s) => s.showQueuePanel);
  const showVideoOverlay = useMusicStore((s) => s.showVideoOverlay);

  const togglePlayPause = useMusicStore((s) => s.togglePlayPause);
  const nextTrack = useMusicStore((s) => s.nextTrack);
  const prevTrack = useMusicStore((s) => s.prevTrack);
  const seek = useMusicStore((s) => s.seek);
  const setVolume = useMusicStore((s) => s.setVolume);
  const toggleMute = useMusicStore((s) => s.toggleMute);
  const toggleShuffle = useMusicStore((s) => s.toggleShuffle);
  const cycleRepeat = useMusicStore((s) => s.cycleRepeat);
  const toggleLike = useMusicStore((s) => s.toggleLike);
  const liked = useMusicStore((s) =>
    currentTrack ? s.likedTracks.some((t) => t.id === currentTrack.id) : false
  );
  const setShowQueuePanel = useMusicStore((s) => s.setShowQueuePanel);
  const setShowMobilePlayer = useMusicStore((s) => s.setShowMobilePlayer);
  const setShowVideoOverlay = useMusicStore((s) => s.setShowVideoOverlay);

  const progressPercent = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  const effectiveVolume = isMuted ? 0 : volume;
  const isYouTubeActive =
    currentTrack?.source === 'youtube' || activeEngine.includes('YT');

  return (
    <>
      {/* Mobile Mini-Player */}
      {currentTrack && (
        <div className="md:hidden fixed bottom-16 left-2 right-2 z-30 rounded-2xl border border-zinc-800/90 bg-zinc-900/95 shadow-2xl backdrop-blur-xl overflow-hidden">
          <div className="h-[2px] w-full bg-zinc-800">
            <div
              className="h-full bg-emerald-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5">
            <button
              onClick={() => setShowMobilePlayer(true)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                {currentTrack.artwork ? (
                  <img
                    src={currentTrack.artwork}
                    alt={currentTrack.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-500">
                    <Music2 className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-white">
                  {currentTrack.title}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <span className="truncate">{currentTrack.artist}</span>
                  <SourceBadge source={currentTrack.source} compact />
                </div>
              </div>
            </button>

            <button
              onClick={() => void togglePlayPause()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-zinc-950"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={() => setShowMobilePlayer(true)}
              className="p-1 text-zinc-400"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop Persistent Player Bar */}
      <footer className="hidden md:grid h-22 shrink-0 grid-cols-[1fr_minmax(340px,1.5fr)_1fr] items-center gap-4 border-t border-zinc-800/80 bg-zinc-950/95 px-4 backdrop-blur-2xl select-none">
        {/* Left: Current Track */}
        <div className="flex min-w-0 items-center gap-3">
          {currentTrack ? (
            <>
              <div className="relative h-13 w-13 shrink-0 overflow-hidden rounded-xl bg-zinc-800 shadow-lg">
                {currentTrack.artwork ? (
                  <img
                    src={currentTrack.artwork}
                    alt={currentTrack.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-500">
                    <Music2 className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-white">
                    {currentTrack.title}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-400">
                  <span className="truncate">{currentTrack.artist}</span>
                  <SourceBadge source={currentTrack.source} compact />
                </div>
                {activeEngine && (
                  <div className="truncate text-[10px] text-zinc-500">{activeEngine}</div>
                )}
              </div>
              <button
                onClick={() => toggleLike(currentTrack)}
                className={`rounded-lg p-1.5 transition-colors ${
                  liked ? 'text-emerald-400' : 'text-zinc-500 hover:text-white'
                }`}
                title="Favorit"
              >
                <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3 text-zinc-500">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800">
                <Music2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-400">Kein Titel ausgewählt</div>
                <div className="text-[11px] text-zinc-600">
                  Spotify • YouTube • SoundCloud • Lokal
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Center: Transport & Seek */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleShuffle}
              className={`rounded-lg p-1.5 transition-colors ${
                shuffle ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'
              }`}
              title="Zufallswiedergabe"
            >
              <Shuffle className="h-4 w-4" />
            </button>

            <button
              onClick={() => void prevTrack()}
              disabled={!currentTrack}
              className="rounded-lg p-1.5 text-zinc-300 hover:text-white disabled:opacity-40 transition-colors"
              title="Vorheriger Titel"
            >
              <SkipBack className="h-5 w-5 fill-current" />
            </button>

            <button
              onClick={() => void togglePlayPause()}
              disabled={!currentTrack}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-950 shadow-lg hover:scale-105 active:scale-95 disabled:opacity-40 transition-transform"
              title={isPlaying ? 'Pause (Leertaste)' : 'Abspielen (Leertaste)'}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={() => void nextTrack()}
              disabled={!currentTrack}
              className="rounded-lg p-1.5 text-zinc-300 hover:text-white disabled:opacity-40 transition-colors"
              title="Nächster Titel"
            >
              <SkipForward className="h-5 w-5 fill-current" />
            </button>

            <button
              onClick={cycleRepeat}
              className={`rounded-lg p-1.5 transition-colors ${
                repeat !== 'off' ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'
              }`}
              title={`Wiederholen: ${repeat}`}
            >
              {repeat === 'one' ? (
                <Repeat1 className="h-4 w-4" />
              ) : (
                <Repeat className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Progress Bar */}
          <div className="flex w-full max-w-xl items-center gap-2.5">
            <span className="w-10 text-right text-[11px] font-mono text-zinc-500">
              {currentTrack?.source === 'radio' ? 'LIVE' : formatTime(position)}
            </span>
            <input
              type="range"
              min={0}
              max={duration > 0 ? duration : 100}
              step={0.5}
              value={duration > 0 ? Math.min(position, duration) : 0}
              disabled={!currentTrack || duration <= 0}
              onChange={(e) => void seek(Number(e.target.value))}
              className="omni-slider flex-1 h-4"
              style={{
                background: `linear-gradient(to right, #10b981 0%, #10b981 ${progressPercent}%, #27272a ${progressPercent}%, #27272a 100%)`,
                height: '4px',
                borderRadius: '9999px',
              }}
            />
            <span className="w-10 text-[11px] font-mono text-zinc-500">
              {currentTrack?.source === 'radio' ? '∞' : formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right: Video Toggle, Queue & Volume */}
        <div className="flex items-center justify-end gap-2">
          {isYouTubeActive && (
            <button
              onClick={() => setShowVideoOverlay(!showVideoOverlay)}
              className={`rounded-lg p-2 transition-colors ${
                showVideoOverlay
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
              title="YouTube Mini-Video ein-/ausblenden"
            >
              <Video className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={() => setShowQueuePanel(!showQueuePanel)}
            className={`rounded-lg p-2 transition-colors ${
              showQueuePanel
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
            title="Warteschlange"
          >
            <ListMusic className="h-4 w-4" />
          </button>

          <button
            onClick={toggleMute}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            title={isMuted ? 'Ton an (M)' : 'Stumm (M)'}
          >
            {isMuted || effectiveVolume === 0 ? (
              <VolumeX className="h-4 w-4 text-rose-400" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={effectiveVolume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="omni-slider w-24"
            style={{
              background: `linear-gradient(to right, #e4e4e7 0%, #e4e4e7 ${
                effectiveVolume * 100
              }%, #27272a ${effectiveVolume * 100}%, #27272a 100%)`,
              height: '4px',
              borderRadius: '9999px',
            }}
          />
        </div>
      </footer>
    </>
  );
}
