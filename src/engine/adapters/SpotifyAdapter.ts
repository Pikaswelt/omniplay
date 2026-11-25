import type { EngineCallbacks, PlaybackAdapter, SpotifyPlaybackMode, Track } from '@/types/music';
import {
  fetchSpotifyDevices,
  spotifyConnectPause,
  spotifyConnectResume,
  spotifyConnectSeek,
  spotifyConnectVolume,
  spotifyTransferAndPlay,
} from '@/services/spotify';
import { searchYouTube } from '@/services/search';
import type { YouTubeAdapter } from './YouTubeAdapter';

interface SpotifySDKPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: string, cb: (payload: unknown) => void): void;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
  getCurrentState(): Promise<{
    paused: boolean;
    position: number;
    duration: number;
    track_window?: { current_track?: { id: string } };
  } | null>;
}

interface SpotifyGlobal {
  Player: new (options: {
    name: string;
    getOAuthToken: (cb: (token: string) => void) => void;
    volume?: number;
  }) => SpotifySDKPlayer;
}

declare global {
  interface Window {
    Spotify?: SpotifyGlobal;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

let spotifySdkPromise: Promise<SpotifyGlobal> | null = null;

function loadSpotifySdk(): Promise<SpotifyGlobal> {
  if (window.Spotify?.Player) return Promise.resolve(window.Spotify);
  if (spotifySdkPromise) return spotifySdkPromise;

  spotifySdkPromise = new Promise((resolve, reject) => {
    const prev = window.onSpotifyWebPlaybackSDKReady;
    window.onSpotifyWebPlaybackSDKReady = () => {
      prev?.();
      if (window.Spotify) resolve(window.Spotify);
      else reject(new Error('Spotify Web Playback SDK nicht geladen.'));
    };

    if (!document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      script.onerror = () => reject(new Error('Spotify SDK Script konnte nicht geladen werden.'));
      document.head.appendChild(script);
    }
  });

  return spotifySdkPromise;
}

export interface SpotifyAdapterOptions {
  getAccessToken: () => Promise<string | null>;
  getPlaybackMode: () => SpotifyPlaybackMode;
  getYouTubeApiKey: () => string;
  youtubeAdapter: YouTubeAdapter;
  onDeviceStatusChange: (ready: boolean, deviceName?: string) => void;
}

export class SpotifyAdapter implements PlaybackAdapter {
  readonly name = 'Spotify Premium SDK';
  private callbacks: EngineCallbacks;
  private options: SpotifyAdapterOptions;
  private sdkPlayer: SpotifySDKPlayer | null = null;
  private sdkDeviceId: string | null = null;
  private sdkFailed = false;
  private activeSubMode: 'sdk' | 'connect' | 'bridge' = 'sdk';
  private activeConnectDeviceId: string | undefined;
  private pollTimer: number | null = null;
  private volume = 0.8;
  private isActive = false;
  private lastPositionMs = 0;
  private lastDurationMs = 0;
  private trackEndedFired = false;

  constructor(callbacks: EngineCallbacks, options: SpotifyAdapterOptions) {
    this.callbacks = callbacks;
    this.options = options;
  }

  async initSdk(): Promise<boolean> {
    if (this.sdkDeviceId) return true;
    const token = await this.options.getAccessToken();
    if (!token) return false;

    try {
      const Spotify = await loadSpotifySdk();
      return await new Promise<boolean>((resolve) => {
        let settled = false;
        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          resolve(ok);
        };

        const timeout = window.setTimeout(() => {
          this.sdkFailed = true;
          this.options.onDeviceStatusChange(false);
          finish(false);
        }, 7000);

        const player = new Spotify.Player({
          name: 'OmniPlay Player',
          volume: this.volume,
          getOAuthToken: (cb) => {
            this.options
              .getAccessToken()
              .then((t) => {
                if (t) cb(t);
              })
              .catch(() => {});
          },
        });

        player.addListener('ready', (payload) => {
          const { device_id } = payload as { device_id: string };
          clearTimeout(timeout);
          this.sdkDeviceId = device_id;
          this.sdkFailed = false;
          this.options.onDeviceStatusChange(true, 'OmniPlay (Spotify Premium)');
          finish(true);
        });

        player.addListener('not_ready', () => {
          this.sdkDeviceId = null;
          this.options.onDeviceStatusChange(false);
        });

        player.addListener('initialization_error', () => {
          clearTimeout(timeout);
          this.sdkFailed = true;
          this.options.onDeviceStatusChange(false);
          finish(false);
        });

        player.addListener('account_error', () => {
          clearTimeout(timeout);
          this.sdkFailed = true;
          this.options.onDeviceStatusChange(false);
          this.callbacks.onError('Spotify Web Playback SDK erfordert Spotify Premium.');
          finish(false);
        });

        player.addListener('player_state_changed', (raw) => {
          if (!this.isActive || this.activeSubMode !== 'sdk' || !raw) return;
          const state = raw as {
            paused: boolean;
            position: number;
            duration: number;
          };

          const wasNearEnd =
            this.lastDurationMs > 0 && this.lastPositionMs > this.lastDurationMs - 2500;
          const resetToZero = state.paused && state.position === 0;

          if (wasNearEnd && resetToZero && !this.trackEndedFired) {
            this.trackEndedFired = true;
            this.stopPolling();
            this.callbacks.onStateChange({ isPlaying: false });
            this.callbacks.onEnded();
            return;
          }

          this.lastPositionMs = state.position;
          this.lastDurationMs = state.duration;
          this.callbacks.onStateChange({
            isPlaying: !state.paused,
            isLoading: false,
            position: state.position / 1000,
            duration: state.duration / 1000,
            activeEngine: 'Spotify Premium SDK',
          });
        });

        this.sdkPlayer = player;
        void player.connect();
      });
    } catch {
      this.sdkFailed = true;
      this.options.onDeviceStatusChange(false);
      return false;
    }
  }

  private startSdkPolling(): void {
    this.stopPolling();
    this.pollTimer = window.setInterval(async () => {
      if (!this.isActive || this.activeSubMode !== 'sdk' || !this.sdkPlayer) return;
      const state = await this.sdkPlayer.getCurrentState();
      if (!state) return;
      this.lastPositionMs = state.position;
      this.lastDurationMs = state.duration;
      this.callbacks.onStateChange({
        isPlaying: !state.paused,
        position: state.position / 1000,
        duration: state.duration / 1000,
      });
    }, 500);
  }

  private stopPolling(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async play(track: Track): Promise<void> {
    this.isActive = true;
    this.trackEndedFired = false;
    this.lastPositionMs = 0;
    this.lastDurationMs = (track.duration || 0) * 1000;
    this.callbacks.onStateChange({ isLoading: true, position: 0, activeEngine: this.name });

    const mode = this.options.getPlaybackMode();
    const token = await this.options.getAccessToken();
    const uri = track.spotifyUri || `spotify:track:${track.sourceId}`;

    // Mode 1: Direct YouTube Audio Bridge
    if (mode === 'youtube-bridge' || !token) {
      await this.playViaYouTubeBridge(track);
      return;
    }

    // Mode 2: Try built-in Spotify Web Playback SDK
    if ((mode === 'sdk' || mode === 'auto') && !this.sdkFailed) {
      const ready = await this.initSdk();
      if (ready && this.sdkDeviceId) {
        try {
          this.activeSubMode = 'sdk';
          await spotifyTransferAndPlay(token, uri, this.sdkDeviceId);
          this.callbacks.onStateChange({
            isPlaying: true,
            isLoading: false,
            activeEngine: 'Spotify Premium SDK',
          });
          this.startSdkPolling();
          return;
        } catch {
          // Fall through to Connect or Bridge
        }
      }
    }

    // Mode 3: Try active Spotify Connect device (e.g. spotifyd / librespot on Arch Linux or Spotify Mobile)
    if (mode === 'connect' || mode === 'auto') {
      try {
        const devices = await fetchSpotifyDevices(token);
        const target = devices.find((d) => d.is_active) || devices[0];
        if (target) {
          this.activeSubMode = 'connect';
          this.activeConnectDeviceId = target.id;
          await spotifyTransferAndPlay(token, uri, target.id);
          this.callbacks.onStateChange({
            isPlaying: true,
            isLoading: false,
            duration: track.duration || 0,
            activeEngine: `Spotify Connect (${target.name})`,
          });
          return;
        }
      } catch {
        // Fall through to Bridge
      }
    }

    // Mode 4: Seamless YouTube Music Audio Bridge fallback (works on Arch Linux WebKitGTK & Mobile without Widevine!)
    await this.playViaYouTubeBridge(track);
  }

  private async playViaYouTubeBridge(track: Track): Promise<void> {
    this.activeSubMode = 'bridge';
    const query = `${track.artist} - ${track.title} audio`;
    const matches = await searchYouTube(query, this.options.getYouTubeApiKey(), true);
    const best = matches[0];
    if (!best) {
      this.callbacks.onStateChange({ isLoading: false, isPlaying: false });
      this.callbacks.onError(
        'Spotify SDK/Connect nicht verfügbar und kein YouTube-Bridge-Match gefunden.'
      );
      return;
    }
    this.callbacks.onStateChange({ activeEngine: 'Spotify → YT Audio Bridge' });
    await this.options.youtubeAdapter.play(best);
  }

  async pause(): Promise<void> {
    this.stopPolling();
    if (this.activeSubMode === 'bridge') {
      await this.options.youtubeAdapter.pause();
      return;
    }
    if (this.activeSubMode === 'sdk' && this.sdkPlayer) {
      await this.sdkPlayer.pause();
      return;
    }
    const token = await this.options.getAccessToken();
    if (token) await spotifyConnectPause(token, this.activeConnectDeviceId);
    this.callbacks.onStateChange({ isPlaying: false });
  }

  async resume(): Promise<void> {
    this.isActive = true;
    if (this.activeSubMode === 'bridge') {
      await this.options.youtubeAdapter.resume();
      return;
    }
    if (this.activeSubMode === 'sdk' && this.sdkPlayer) {
      await this.sdkPlayer.resume();
      this.startSdkPolling();
      return;
    }
    const token = await this.options.getAccessToken();
    if (token) await spotifyConnectResume(token, this.activeConnectDeviceId);
    this.callbacks.onStateChange({ isPlaying: true });
  }

  async seek(seconds: number): Promise<void> {
    if (this.activeSubMode === 'bridge') {
      await this.options.youtubeAdapter.seek(seconds);
      return;
    }
    const ms = Math.max(0, Math.round(seconds * 1000));
    if (this.activeSubMode === 'sdk' && this.sdkPlayer) {
      await this.sdkPlayer.seek(ms);
      this.callbacks.onStateChange({ position: seconds });
      return;
    }
    const token = await this.options.getAccessToken();
    if (token) await spotifyConnectSeek(token, ms, this.activeConnectDeviceId);
    this.callbacks.onStateChange({ position: seconds });
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.activeSubMode === 'bridge') {
      this.options.youtubeAdapter.setVolume(this.volume);
      return;
    }
    if (this.sdkPlayer) {
      void this.sdkPlayer.setVolume(this.volume);
    }
    if (this.activeSubMode === 'connect') {
      void this.options.getAccessToken().then((token) => {
        if (token) return spotifyConnectVolume(token, this.volume * 100, this.activeConnectDeviceId);
      });
    }
  }

  async stop(): Promise<void> {
    this.isActive = false;
    this.stopPolling();
    if (this.activeSubMode === 'bridge') {
      await this.options.youtubeAdapter.stop();
    } else if (this.activeSubMode === 'sdk' && this.sdkPlayer) {
      try {
        await this.sdkPlayer.pause();
      } catch {
        // ignore
      }
    }
  }

  destroy(): void {
    void this.stop();
    this.sdkPlayer?.disconnect();
    this.sdkPlayer = null;
    this.sdkDeviceId = null;
  }
}
