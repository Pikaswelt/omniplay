export type SourceType = 'spotify' | 'youtube' | 'soundcloud' | 'local' | 'radio';

export interface Track {
  id: string;
  source: SourceType;
  sourceId: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // seconds, 0 for live radio
  artwork?: string;
  url?: string;
  streamUrl?: string;
  spotifyUri?: string;
  addedAt?: number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  cover?: string;
  tracks: Track[];
  createdAt: number;
  updatedAt: number;
  syncedFrom?: 'spotify';
  spotifyPlaylistId?: string;
}

export type RepeatMode = 'off' | 'all' | 'one';

export type SpotifyPlaybackMode = 'auto' | 'sdk' | 'connect' | 'youtube-bridge';

export interface SpotifyUserProfile {
  id: string;
  displayName: string;
  email?: string;
  product?: string;
  avatar?: string;
}

export interface SpotifyAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number;
  profile: SpotifyUserProfile | null;
}

export interface AppSettings {
  spotifyClientId: string;
  spotifyPlaybackMode: SpotifyPlaybackMode;
  youtubeApiKey: string;
  youtubeShowVideo: boolean;
  localFolders: string[];
  enableVisualizer: boolean;
}

export interface EngineCallbacks {
  onStateChange: (state: {
    isPlaying?: boolean;
    isLoading?: boolean;
    position?: number;
    duration?: number;
    activeEngine?: string;
  }) => void;
  onEnded: () => void;
  onError: (message: string) => void;
}

export interface PlaybackAdapter {
  readonly name: string;
  play(track: Track): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seek(seconds: number): Promise<void>;
  setVolume(volume: number): void; // 0..1
  stop(): Promise<void>;
  destroy(): void;
}

export type ActiveView =
  | 'home'
  | 'search'
  | 'library'
  | 'liked'
  | 'playlist'
  | 'local'
  | 'radio'
  | 'settings';
