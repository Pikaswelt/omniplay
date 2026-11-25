import type { EngineCallbacks, PlaybackAdapter, Track } from '@/types/music';

interface SCWidget {
  bind(eventName: string, listener: (payload?: { currentPosition?: number }) => void): void;
  unbind(eventName: string): void;
  load(url: string, options?: Record<string, unknown>): void;
  play(): void;
  pause(): void;
  seekTo(milliseconds: number): void;
  setVolume(volume: number): void;
  getDuration(cb: (ms: number) => void): void;
  getPosition(cb: (ms: number) => void): void;
}

interface SCGlobal {
  Widget: {
    (iframe: HTMLIFrameElement): SCWidget;
    Events: {
      READY: string;
      PLAY: string;
      PAUSE: string;
      FINISH: string;
      PLAY_PROGRESS: string;
      ERROR: string;
    };
  };
}

declare global {
  interface Window {
    SC?: SCGlobal;
  }
}

let scApiPromise: Promise<SCGlobal> | null = null;

function loadSoundCloudApi(): Promise<SCGlobal> {
  if (window.SC?.Widget) return Promise.resolve(window.SC);
  if (scApiPromise) return scApiPromise;

  scApiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://w.soundcloud.com/player/api.js"]');
    if (existing && window.SC?.Widget) {
      resolve(window.SC);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://w.soundcloud.com/player/api.js';
    script.async = true;
    script.onload = () => {
      if (window.SC?.Widget) resolve(window.SC);
      else reject(new Error('SoundCloud Widget API nicht verfügbar.'));
    };
    script.onerror = () => reject(new Error('SoundCloud Widget API konnte nicht geladen werden.'));
    document.head.appendChild(script);
  });

  return scApiPromise;
}

export class SoundCloudAdapter implements PlaybackAdapter {
  readonly name = 'SoundCloud Widget';
  private callbacks: EngineCallbacks;
  private iframe: HTMLIFrameElement | null = null;
  private widget: SCWidget | null = null;
  private volume = 0.8;
  private isActive = false;
  private durationSec = 0;

  constructor(callbacks: EngineCallbacks) {
    this.callbacks = callbacks;
  }

  private async ensureWidget(initialUrl: string): Promise<SCWidget> {
    const SC = await loadSoundCloudApi();

    if (!this.iframe) {
      const iframe = document.createElement('iframe');
      iframe.id = 'omniplay-sc-iframe';
      iframe.allow = 'autoplay';
      iframe.style.cssText =
        'position:fixed;bottom:-200px;left:-200px;width:120px;height:120px;opacity:0;pointer-events:none;border:0;';
      iframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(
        initialUrl
      )}&auto_play=true&show_artwork=false&visual=false`;
      document.body.appendChild(iframe);
      this.iframe = iframe;

      await new Promise<void>((resolve) => {
        const widget = SC.Widget(iframe);
        this.widget = widget;

        widget.bind(SC.Widget.Events.READY, () => {
          widget.setVolume(Math.round(this.volume * 100));
          resolve();
        });

        widget.bind(SC.Widget.Events.PLAY, () => {
          if (!this.isActive) return;
          widget.getDuration((ms) => {
            this.durationSec = Math.round(ms / 1000);
            this.callbacks.onStateChange({
              isPlaying: true,
              isLoading: false,
              duration: this.durationSec,
              activeEngine: this.name,
            });
          });
        });

        widget.bind(SC.Widget.Events.PAUSE, () => {
          if (!this.isActive) return;
          this.callbacks.onStateChange({ isPlaying: false });
        });

        widget.bind(SC.Widget.Events.PLAY_PROGRESS, (payload) => {
          if (!this.isActive || !payload?.currentPosition) return;
          this.callbacks.onStateChange({
            position: payload.currentPosition / 1000,
            duration: this.durationSec,
          });
        });

        widget.bind(SC.Widget.Events.FINISH, () => {
          if (!this.isActive) return;
          this.callbacks.onStateChange({ isPlaying: false });
          this.callbacks.onEnded();
        });

        widget.bind(SC.Widget.Events.ERROR, () => {
          if (!this.isActive) return;
          this.callbacks.onStateChange({ isPlaying: false, isLoading: false });
          this.callbacks.onError('SoundCloud Track konnte nicht abgespielt werden.');
        });
      });

      return this.widget!;
    }

    return this.widget!;
  }

  async play(track: Track): Promise<void> {
    this.isActive = true;
    this.durationSec = track.duration || 0;
    this.callbacks.onStateChange({ isLoading: true, position: 0, activeEngine: this.name });

    const trackUrl = track.url || track.sourceId;
    const hadIframe = Boolean(this.iframe);
    const widget = await this.ensureWidget(trackUrl);

    if (hadIframe) {
      await new Promise<void>((resolve) => {
        widget.load(trackUrl, {
          auto_play: true,
          show_artwork: false,
          callback: () => {
            widget.setVolume(Math.round(this.volume * 100));
            widget.play();
            resolve();
          },
        });
      });
    } else {
      widget.setVolume(Math.round(this.volume * 100));
      widget.play();
    }
  }

  async pause(): Promise<void> {
    this.widget?.pause();
  }

  async resume(): Promise<void> {
    this.isActive = true;
    this.widget?.play();
  }

  async seek(seconds: number): Promise<void> {
    this.widget?.seekTo(Math.max(0, Math.round(seconds * 1000)));
    this.callbacks.onStateChange({ position: Math.max(0, seconds) });
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.widget?.setVolume(Math.round(this.volume * 100));
  }

  async stop(): Promise<void> {
    this.isActive = false;
    try {
      this.widget?.pause();
    } catch {
      // ignore
    }
  }

  destroy(): void {
    void this.stop();
    this.iframe?.remove();
    this.iframe = null;
    this.widget = null;
  }
}
