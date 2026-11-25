import {
  ChevronDown,
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
} from 'lucide-react';
import { useMusicStore } from '@/store/useMusicStore';
import { formatTime, SOURCE_META } from '@/utils/format';
import { SourceBadge } from './SourceBadge';

export function MobileNowPlaying() {
  const open = useMusicStore((s) => s.showMobilePlayer);
  const setOpen = useMusicStore((s) => s.setShowMobilePlayer);
  const currentTrack = useMusicStore((s) => s.currentTrack);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const isLoading = useMusicStore((s) => s.isLoading);
  const position = useMusicStore((s) => s.position);
  const duration = useMusicStore((s) => s.duration);
  const shuffle = useMusicStore((s) => s.shuffle);
  const repeat = useMusicStore((s) => s.repeat);
  const activeEngine = useMusicStore((s) => s.activeEngine);

  const togglePlayPause = useMusicStore((s) => s.togglePlayPause);
  const nextTrack = useMusicStore((s) => s.nextTrack);
  const prevTrack = useMusicStore((s) => s.prevTrack);
  const seek = useMusicStore((s) => s.seek);
  const toggleShuffle = useMusicStore((s) => s.toggleShuffle);
  const cycleRepeat = useMusicStore((s) => s.cycleRepeat);
  const toggleLike = useMusicStore((s) => s.toggleLike);
  const liked = useMusicStore((s) =>
    currentTrack ? s.likedTracks.some((t) => t.id === currentTrack.id) : false
  );
  const setShowQueuePanel = useMusicStore((s) => s.setShowQueuePanel);

  if (!open || !currentTrack) return null;

  const progress = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  const glow = SOURCE_META[currentTrack.source].glowColor;

  return (
    <div
      className="md:hidden fixed inset-0 z-50 flex flex-col bg-zinc-950 px-6 pt-6 pb-8"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 20%, ${glow}, transparent 65%)`,
      }}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen(false)}
          className="rounded-full p-2 text-zinc-300 hover:bg-zinc-800/80"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
        <div className="text-center">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            OmniPlay Player
          </div>
          {activeEngine && <div className="text-[11px] text-zinc-500">{activeEngine}</div>}
        </div>
        <button
          onClick={() => {
            setOpen(false);
            setShowQueuePanel(true);
          }}
          className="rounded-full p-2 text-zinc-300 hover:bg-zinc-800/80"
        >
          <ListMusic className="h-5 w-5" />
        </button>
      </div>

      {/* Artwork */}
      <div className="my-auto flex items-center justify-center py-6">
        <div className="aspect-square w-full max-w-[320px] overflow-hidden rounded-3xl bg-zinc-900 shadow-2xl ring-1 ring-white/10">
          {currentTrack.artwork ? (
            <img
              src={currentTrack.artwork}
              alt={currentTrack.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-600">
              <Music2 className="h-20 w-20" />
            </div>
          )}
        </div>
      </div>

      {/* Track Info */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold text-white">{currentTrack.title}</h2>
          <p className="truncate text-sm text-zinc-400">{currentTrack.artist}</p>
          <div className="mt-2">
            <SourceBadge source={currentTrack.source} />
          </div>
        </div>
        <button
          onClick={() => toggleLike(currentTrack)}
          className={`p-2 ${liked ? 'text-emerald-400' : 'text-zinc-400'}`}
        >
          <Heart className={`h-6 w-6 ${liked ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Seek Bar */}
      <div className="mb-6">
        <input
          type="range"
          min={0}
          max={duration > 0 ? duration : 100}
          step={0.5}
          value={duration > 0 ? Math.min(position, duration) : 0}
          disabled={duration <= 0}
          onChange={(e) => void seek(Number(e.target.value))}
          className="omni-slider w-full"
          style={{
            background: `linear-gradient(to right, #10b981 0%, #10b981 ${progress}%, #27272a ${progress}%, #27272a 100%)`,
            height: '4px',
            borderRadius: '9999px',
          }}
        />
        <div className="mt-1.5 flex justify-between text-xs font-mono text-zinc-500">
          <span>{currentTrack.source === 'radio' ? 'LIVE' : formatTime(position)}</span>
          <span>{currentTrack.source === 'radio' ? '∞' : formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-2">
        <button
          onClick={toggleShuffle}
          className={shuffle ? 'text-emerald-400' : 'text-zinc-400'}
        >
          <Shuffle className="h-5 w-5" />
        </button>
        <button onClick={() => void prevTrack()} className="text-white">
          <SkipBack className="h-7 w-7 fill-current" />
        </button>
        <button
          onClick={() => void togglePlayPause()}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-zinc-950 shadow-xl active:scale-95 transition-transform"
        >
          {isLoading ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-7 w-7 fill-current" />
          ) : (
            <Play className="h-7 w-7 fill-current ml-1" />
          )}
        </button>
        <button onClick={() => void nextTrack()} className="text-white">
          <SkipForward className="h-7 w-7 fill-current" />
        </button>
        <button
          onClick={cycleRepeat}
          className={repeat !== 'off' ? 'text-emerald-400' : 'text-zinc-400'}
        >
          {repeat === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
