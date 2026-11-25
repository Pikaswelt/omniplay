import { ListMusic, Music2, Trash2, X } from 'lucide-react';
import { useMusicStore } from '@/store/useMusicStore';
import { SourceBadge } from './SourceBadge';

export function QueuePanel() {
  const showQueuePanel = useMusicStore((s) => s.showQueuePanel);
  const setShowQueuePanel = useMusicStore((s) => s.setShowQueuePanel);
  const queue = useMusicStore((s) => s.queue);
  const queueIndex = useMusicStore((s) => s.queueIndex);
  const currentTrack = useMusicStore((s) => s.currentTrack);
  const playTrack = useMusicStore((s) => s.playTrack);
  const removeFromQueue = useMusicStore((s) => s.removeFromQueue);
  const clearQueue = useMusicStore((s) => s.clearQueue);

  if (!showQueuePanel) return null;

  const upcoming = queue.slice(queueIndex + 1);

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-80 max-w-[90vw] flex-col border-l border-zinc-800 bg-zinc-950/98 backdrop-blur-2xl shadow-2xl lg:static lg:z-auto lg:shadow-none">
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <ListMusic className="h-4 w-4 text-emerald-400" />
          Warteschlange
        </div>
        <div className="flex items-center gap-1">
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-rose-400"
            >
              Leeren
            </button>
          )}
          <button
            onClick={() => setShowQueuePanel(false)}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {currentTrack && (
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Läuft gerade
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5">
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
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
                <div className="truncate text-xs font-semibold text-emerald-300">
                  {currentTrack.title}
                </div>
                <div className="truncate text-[11px] text-zinc-400">{currentTrack.artist}</div>
                <div className="mt-1">
                  <SourceBadge source={currentTrack.source} compact />
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Als Nächstes ({upcoming.length})
          </div>
          {upcoming.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-500">
              Keine weiteren Titel in der Warteschlange.
            </div>
          ) : (
            <div className="space-y-1">
              {upcoming.map((track, idx) => {
                const actualIdx = queueIndex + 1 + idx;
                return (
                  <div
                    key={`${track.id}-${actualIdx}`}
                    className="group flex items-center gap-2.5 rounded-xl p-2 hover:bg-zinc-900 transition-colors"
                  >
                    <button
                      onClick={() => void playTrack(track, queue)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    >
                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                        {track.artwork ? (
                          <img
                            src={track.artwork}
                            alt={track.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-zinc-500">
                            <Music2 className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-zinc-200">
                          {track.title}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                          <span className="truncate">{track.artist}</span>
                          <SourceBadge source={track.source} compact />
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => removeFromQueue(actualIdx)}
                      className="rounded-lg p-1 text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
