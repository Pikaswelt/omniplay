import type { EngineCallbacks, PlaybackAdapter, Track } from '@/types/music';
import { convertLocalAudioUrl } from '@/services/tauriBridge';

export class HtmlAudioAdapter implements PlaybackAdapter {
  readonly name = 'HTML5 Audio';
  private audio: HTMLAudioElement;
  private callbacks: EngineCallbacks;
  private volume = 0.8;

  constructor(callbacks: EngineCallbacks) {
    this.callbacks = callbacks;
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.volume = this.volume;

    this.audio.addEventListener('playing', () => {
      this.callbacks.onStateChange({
        isPlaying: true,
        isLoading: false,
        duration: Number.isFinite(this.audio.duration) ? this.audio.duration : 0,
        activeEngine: this.name,
      });
    });

    this.audio.addEventListener('pause', () => {
      this.callbacks.onStateChange({ isPlaying: false });
    });

    this.audio.addEventListener('waiting', () => {
      this.callbacks.onStateChange({ isLoading: true });
    });

    this.audio.addEventListener('loadedmetadata', () => {
      const dur = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
      this.callbacks.onStateChange({ duration: dur });
    });

    this.audio.addEventListener('timeupdate', () => {
      this.callbacks.onStateChange({
        position: this.audio.currentTime || 0,
        duration: Number.isFinite(this.audio.duration) ? this.audio.duration : 0,
      });
    });

    this.audio.addEventListener('ended', () => {
      this.callbacks.onStateChange({ isPlaying: false });
      this.callbacks.onEnded();
    });

    this.audio.addEventListener('error', () => {
      const errCode = this.audio.error?.code;
      this.callbacks.onStateChange({ isPlaying: false, isLoading: false });
      this.callbacks.onError(`Audio-Wiedergabefehler (Code ${errCode ?? 'unbekannt'})`);
    });
  }

  async play(track: Track): Promise<void> {
    this.callbacks.onStateChange({ isLoading: true, position: 0, activeEngine: this.name });
    let src = track.streamUrl || track.url || track.sourceId;

    if (track.source === 'local' && !src.startsWith('blob:') && !src.startsWith('http')) {
      src = await convertLocalAudioUrl(track.sourceId);
    }

    this.audio.pause();
    this.audio.src = src;
    this.audio.volume = this.volume;
    this.audio.currentTime = 0;

    try {
      await this.audio.play();
    } catch (err) {
      this.callbacks.onStateChange({ isLoading: false, isPlaying: false });
      throw err;
    }
  }

  async pause(): Promise<void> {
    this.audio.pause();
  }

  async resume(): Promise<void> {
    await this.audio.play();
  }

  async seek(seconds: number): Promise<void> {
    if (Number.isFinite(this.audio.duration) && this.audio.duration > 0) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration));
      this.callbacks.onStateChange({ position: this.audio.currentTime });
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.audio.volume = this.volume;
  }

  async stop(): Promise<void> {
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
  }

  destroy(): void {
    void this.stop();
  }
}
