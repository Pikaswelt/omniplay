import type { EngineCallbacks, PlaybackAdapter, Track } from '@/types/music';

interface YTPlayerInstance {
  loadVideoById(videoId: string): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  setVolume(volume: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
}

interface YTGlobal {
  Player: new (
    element: HTMLElement | string,
    options: {
      height?: string | number;
      width?: string | number;
      videoId?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: (event: { data: number }) => void;
      };
    }
  ) => YTPlayerInstance;
  PlayerState: {
    UNSTARTED: number;
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

declare global {
  interface Window {
    YT?: YTGlobal;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<YTGlobal> | null = null;

function loadYouTubeApi(): Promise<YTGlobal> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT) resolve(window.YT);
      else reject(new Error('YouTube IFrame API konnte nicht initialisiert werden.'));
    };

    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existing) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => reject(new Error('YouTube IFrame API Script konnte nicht geladen werden.'));
      document.head.appendChild(tag);
    }
  });

  return ytApiPromise;
}

export class YouTubeAdapter implements PlaybackAdapter {
  readonly name = 'YouTube Engine';
  private callbacks: EngineCallbacks;
  private player: YTPlayerInstance | null = null;
  private playerReady = false;
  private initPromise: Promise<void> | null = null;
  private pollTimer: number | null = null;
  private volume = 0.8;
  private isActive = false;

  constructor(callbacks: EngineCallbacks) {
    this.callbacks = callbacks;
  }

  private ensureHostElement(): HTMLElement {
    let host = document.getElementById('omniplay-yt-player-slot');
    if (!host) {
      host = document.createElement('div');
      host.id = 'omniplay-yt-player-slot';
      host.style.cssText =
        'position:fixed;bottom:0;right:0;width:320px;height:180px;opacity:0;pointer-events:none;z-index:-1;';
      document.body.appendChild(host);
    }
    return host;
  }

  private async ensurePlayer(): Promise<YTPlayerInstance> {
    if (this.player && this.playerReady) return this.player;
    if (this.initPromise) {
      await this.initPromise;
      if (this.player) return this.player;
    }

    this.initPromise = new Promise<void>((resolve, reject) => {
      loadYouTubeApi()
        .then((YT) => {
          const host = this.ensureHostElement();
          let inner = host.querySelector<HTMLElement>('#omniplay-yt-iframe-target');
          if (!inner) {
            inner = document.createElement('div');
            inner.id = 'omniplay-yt-iframe-target';
            inner.style.width = '100%';
            inner.style.height = '100%';
            host.appendChild(inner);
          }

          const playerVars: Record<string, string | number> = {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
          };
          if (window.location.origin.startsWith('http')) {
            playerVars.origin = window.location.origin;
          }

          this.player = new YT.Player(inner, {
            width: '100%',
            height: '100%',
            playerVars,
            events: {
              onReady: () => {
                this.playerReady = true;
                this.player?.setVolume(Math.round(this.volume * 100));
                resolve();
              },
              onStateChange: (event) => {
                if (!this.isActive) return;
                const state = event.data;
                if (state === YT.PlayerState.PLAYING) {
                  this.callbacks.onStateChange({
                    isPlaying: true,
                    isLoading: false,
                    duration: this.player?.getDuration() || 0,
                    activeEngine: this.name,
                  });
                  this.startPolling();
                } else if (state === YT.PlayerState.PAUSED) {
                  this.callbacks.onStateChange({ isPlaying: false, isLoading: false });
                  this.stopPolling();
                } else if (state === YT.PlayerState.BUFFERING) {
                  this.callbacks.onStateChange({ isLoading: true });
                } else if (state === YT.PlayerState.ENDED) {
                  this.stopPolling();
                  this.callbacks.onStateChange({ isPlaying: false });
                  this.callbacks.onEnded();
                }
              },
              onError: (event) => {
                if (!this.isActive) return;
                this.stopPolling();
                this.callbacks.onStateChange({ isPlaying: false, isLoading: false });
                const reasons: Record<number, string> = {
                  2: 'Ungültige YouTube Video-ID.',
                  5: 'HTML5-Player-Fehler bei YouTube.',
                  100: 'YouTube-Video nicht gefunden oder privat.',
                  101: 'Einbettung vom Uploader deaktiviert.',
                  150: 'Einbettung vom Uploader deaktiviert.',
                };
                this.callbacks.onError(
                  reasons[event.data] || `YouTube Wiedergabefehler (Code ${event.data})`
                );
              },
            },
          });
        })
        .catch(reject);
    });

    await this.initPromise;
    if (!this.player) throw new Error('YouTube Player nicht initialisiert');
    return this.player;
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollTimer = window.setInterval(() => {
      if (!this.player || !this.isActive) return;
      const pos = this.player.getCurrentTime?.() ?? 0;
      const dur = this.player.getDuration?.() ?? 0;
      this.callbacks.onStateChange({ position: pos, duration: dur });
    }, 400);
  }

  private stopPolling(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async play(track: Track): Promise<void> {
    this.isActive = true;
    this.callbacks.onStateChange({ isLoading: true, position: 0, activeEngine: this.name });
    const player = await this.ensurePlayer();
    player.setVolume(Math.round(this.volume * 100));
    player.loadVideoById(track.sourceId);
    player.playVideo();
  }

  async pause(): Promise<void> {
    this.stopPolling();
    this.player?.pauseVideo();
  }

  async resume(): Promise<void> {
    this.isActive = true;
    this.player?.playVideo();
    this.startPolling();
  }

  async seek(seconds: number): Promise<void> {
    this.player?.seekTo(Math.max(0, seconds), true);
    this.callbacks.onStateChange({ position: Math.max(0, seconds) });
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.player?.setVolume(Math.round(this.volume * 100));
  }

  async stop(): Promise<void> {
    this.isActive = false;
    this.stopPolling();
    try {
      this.player?.stopVideo();
    } catch {
      // ignore if player not ready
    }
  }

  destroy(): void {
    void this.stop();
    try {
      this.player?.destroy();
    } catch {
      // ignore
    }
    this.player = null;
    this.playerReady = false;
    this.initPromise = null;
  }
}
