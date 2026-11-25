import type { EngineCallbacks, PlaybackAdapter, SourceType, SpotifyPlaybackMode, Track } from '@/types/music';
import { HtmlAudioAdapter } from './adapters/HtmlAudioAdapter';
import { YouTubeAdapter } from './adapters/YouTubeAdapter';
import { SoundCloudAdapter } from './adapters/SoundCloudAdapter';
import { SpotifyAdapter } from './adapters/SpotifyAdapter';

export interface PlayerEngineHooks {
  onStateChange: EngineCallbacks['onStateChange'];
  onEnded: () => void;
  onError: (message: string) => void;
  onNext: () => void;
  onPrev: () => void;
  getSpotifyAccessToken: () => Promise<string | null>;
  getSpotifyPlaybackMode: () => SpotifyPlaybackMode;
  getYouTubeApiKey: () => string;
  onSpotifyDeviceStatus: (ready: boolean, deviceName?: string) => void;
}

class PlayerEngine {
  private htmlAdapter: HtmlAudioAdapter | null = null;
  private youtubeAdapter: YouTubeAdapter | null = null;
  private soundCloudAdapter: SoundCloudAdapter | null = null;
  private spotifyAdapter: SpotifyAdapter | null = null;
  private activeAdapter: PlaybackAdapter | null = null;
  private hooks: PlayerEngineHooks | null = null;
  private currentVolume = 0.8;

  init(hooks: PlayerEngineHooks): void {
    if (this.hooks) {
      this.hooks = hooks;
      return;
    }
    this.hooks = hooks;

    const callbacks: EngineCallbacks = {
      onStateChange: (state) => this.hooks?.onStateChange(state),
      onEnded: () => this.hooks?.onEnded(),
      onError: (msg) => this.hooks?.onError(msg),
    };

    this.htmlAdapter = new HtmlAudioAdapter(callbacks);
    this.youtubeAdapter = new YouTubeAdapter(callbacks);
    this.soundCloudAdapter = new SoundCloudAdapter(callbacks);
    this.spotifyAdapter = new SpotifyAdapter(callbacks, {
      getAccessToken: () => this.hooks?.getSpotifyAccessToken() ?? Promise.resolve(null),
      getPlaybackMode: () => this.hooks?.getSpotifyPlaybackMode() ?? 'auto',
      getYouTubeApiKey: () => this.hooks?.getYouTubeApiKey() ?? '',
      youtubeAdapter: this.youtubeAdapter,
      onDeviceStatusChange: (ready, name) => this.hooks?.onSpotifyDeviceStatus(ready, name),
    });

    this.setupMediaSession();
  }

  private setupMediaSession(): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.setActionHandler('play', () => void this.resume());
      navigator.mediaSession.setActionHandler('pause', () => void this.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.hooks?.onPrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.hooks?.onNext());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (typeof details.seekTime === 'number') {
          void this.seek(details.seekTime);
        }
      });
    } catch {
      // Some WebViews don't support all action handlers
    }
  }

  private updateMediaMetadata(track: Track): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album || `OmniPlay • ${track.source.toUpperCase()}`,
        artwork: track.artwork
          ? [{ src: track.artwork, sizes: '512x512', type: 'image/jpeg' }]
          : [],
      });
    } catch {
      // ignore
    }
  }

  private getAdapterForSource(source: SourceType): PlaybackAdapter {
    switch (source) {
      case 'spotify':
        return this.spotifyAdapter!;
      case 'youtube':
        return this.youtubeAdapter!;
      case 'soundcloud':
        return this.soundCloudAdapter!;
      case 'local':
      case 'radio':
      default:
        return this.htmlAdapter!;
    }
  }

  async initSpotifySdk(): Promise<boolean> {
    return (await this.spotifyAdapter?.initSdk()) ?? false;
  }

  async playTrack(track: Track): Promise<void> {
    const nextAdapter = this.getAdapterForSource(track.source);

    // Stop previous adapter if switching sources
    if (this.activeAdapter && this.activeAdapter !== nextAdapter) {
      await this.activeAdapter.stop();
    }

    this.activeAdapter = nextAdapter;
    this.activeAdapter.setVolume(this.currentVolume);
    this.updateMediaMetadata(track);

    try {
      await this.activeAdapter.play(track);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wiedergabe fehlgeschlagen.';
      this.hooks?.onError(msg);
    }
  }

  async pause(): Promise<void> {
    await this.activeAdapter?.pause();
  }

  async resume(): Promise<void> {
    await this.activeAdapter?.resume();
  }

  async seek(seconds: number): Promise<void> {
    await this.activeAdapter?.seek(seconds);
  }

  setVolume(volume: number): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    this.htmlAdapter?.setVolume(this.currentVolume);
    this.youtubeAdapter?.setVolume(this.currentVolume);
    this.soundCloudAdapter?.setVolume(this.currentVolume);
    this.spotifyAdapter?.setVolume(this.currentVolume);
  }

  async stop(): Promise<void> {
    await this.activeAdapter?.stop();
    this.activeAdapter = null;
  }
}

export const playerEngine = new PlayerEngine();
