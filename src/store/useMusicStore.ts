import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ActiveView,
  AppSettings,
  Playlist,
  RepeatMode,
  SpotifyAuthState,
  Track,
} from '@/types/music';
import { playerEngine } from '@/engine/PlayerEngine';
import { refreshSpotifyToken } from '@/services/spotify';

export const DEFAULT_RADIO_STATIONS: Track[] = [
  {
    id: 'radio:lofi-girl-chill',
    source: 'radio',
    sourceId: 'https://play.streamafrica.net/lofiradio',
    streamUrl: 'https://play.streamafrica.net/lofiradio',
    title: 'Lo-Fi Beats 24/7',
    artist: 'Chill & Study Radio',
    album: 'Live Radio',
    duration: 0,
    artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
  },
  {
    id: 'radio:somafm-groovesalad',
    source: 'radio',
    sourceId: 'https://ice2.somafm.com/groovesalad-128-mp3',
    streamUrl: 'https://ice2.somafm.com/groovesalad-128-mp3',
    title: 'Groove Salad',
    artist: 'SomaFM • Ambient & Downtempo',
    album: 'Live Radio',
    duration: 0,
    artwork: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80',
  },
  {
    id: 'radio:somafm-defcon',
    source: 'radio',
    sourceId: 'https://ice2.somafm.com/defcon-128-mp3',
    streamUrl: 'https://ice2.somafm.com/defcon-128-mp3',
    title: 'DEF CON Radio',
    artist: 'SomaFM • Coding & Electronic',
    album: 'Live Radio',
    duration: 0,
    artwork: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80',
  },
  {
    id: 'radio:somafm-vaporwaves',
    source: 'radio',
    sourceId: 'https://ice2.somafm.com/vaporwaves-128-mp3',
    streamUrl: 'https://ice2.somafm.com/vaporwaves-128-mp3',
    title: 'Vaporwaves',
    artist: 'SomaFM • Synthwave & Retrowave',
    album: 'Live Radio',
    duration: 0,
    artwork: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80',
  },
  {
    id: 'radio:nightride-fm',
    source: 'radio',
    sourceId: 'https://stream.nightride.fm/nightride.m4a',
    streamUrl: 'https://stream.nightride.fm/nightride.m4a',
    title: 'Nightride FM',
    artist: 'Synthwave / Outrun 24/7',
    album: 'Live Radio',
    duration: 0,
    artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
  },
];

export const DEFAULT_PLAYLISTS: Playlist[] = [
  {
    id: 'pl-starter-mix',
    name: 'OmniPlay Cross-Platform Mix',
    description: 'Gemischte Playlist — füge Songs von Spotify, YouTube, SoundCloud & Lokal zusammen!',
    tracks: [
      {
        id: 'youtube:jfKfPfyJRdk',
        source: 'youtube',
        sourceId: 'jfKfPfyJRdk',
        title: 'lofi hip hop radio 📚 beats to relax/study to',
        artist: 'Lofi Girl (YouTube)',
        duration: 0,
        artwork: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
        url: 'https://music.youtube.com/watch?v=jfKfPfyJRdk',
      },
      DEFAULT_RADIO_STATIONS[1],
      DEFAULT_RADIO_STATIONS[4],
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

interface MusicState {
  // Playback
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  queue: Track[];
  queueIndex: number;
  activeEngine: string;
  playbackError: string | null;
  spotifyDeviceReady: boolean;
  spotifyDeviceName: string | null;

  // Library
  likedTracks: Track[];
  playlists: Playlist[];
  localTracks: Track[];
  radioStations: Track[];
  recentTracks: Track[];

  // Auth & Settings
  spotifyAuth: SpotifyAuthState;
  settings: AppSettings;

  // UI
  activeView: ActiveView;
  selectedPlaylistId: string | null;
  showQueuePanel: boolean;
  showMobilePlayer: boolean;
  showVideoOverlay: boolean;
  toastMessage: string | null;

  // Actions
  initEngine: () => void;
  playTrack: (track: Track, contextQueue?: Track[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  nextTrack: () => Promise<void>;
  prevTrack: () => Promise<void>;
  seek: (seconds: number) => Promise<void>;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;

  // Library Actions
  toggleLike: (track: Track) => void;
  isLiked: (trackId: string) => boolean;
  createPlaylist: (name: string, description?: string) => Playlist;
  deletePlaylist: (playlistId: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  importPlaylists: (playlists: Playlist[]) => void;
  mergeLikedTracks: (tracks: Track[]) => void;
  setLocalTracks: (tracks: Track[]) => void;
  addLocalTracks: (tracks: Track[]) => void;
  addRadioStation: (station: Track) => void;

  // Auth & Settings Actions
  setSpotifyAuth: (auth: SpotifyAuthState) => void;
  logoutSpotify: () => void;
  getValidSpotifyToken: () => Promise<string | null>;
  updateSettings: (partial: Partial<AppSettings>) => void;

  // UI Actions
  setActiveView: (view: ActiveView, playlistId?: string) => void;
  setShowQueuePanel: (open: boolean) => void;
  setShowMobilePlayer: (open: boolean) => void;
  setShowVideoOverlay: (open: boolean) => void;
  showToast: (message: string) => void;
}

let toastTimer: number | null = null;

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      isPlaying: false,
      isLoading: false,
      position: 0,
      duration: 0,
      volume: 0.8,
      isMuted: false,
      shuffle: false,
      repeat: 'off',
      queue: [],
      queueIndex: -1,
      activeEngine: '',
      playbackError: null,
      spotifyDeviceReady: false,
      spotifyDeviceName: null,

      likedTracks: [],
      playlists: DEFAULT_PLAYLISTS,
      localTracks: [],
      radioStations: DEFAULT_RADIO_STATIONS,
      recentTracks: [],

      spotifyAuth: {
        accessToken: null,
        refreshToken: null,
        expiresAt: 0,
        profile: null,
      },
      settings: {
        spotifyClientId: '',
        spotifyPlaybackMode: 'auto',
        youtubeApiKey: '',
        youtubeShowVideo: false,
        localFolders: [],
        enableVisualizer: true,
      },

      activeView: 'home',
      selectedPlaylistId: null,
      showQueuePanel: false,
      showMobilePlayer: false,
      showVideoOverlay: false,
      toastMessage: null,

      initEngine: () => {
        playerEngine.init({
          onStateChange: (partial) => {
            set((state) => ({
              isPlaying: partial.isPlaying ?? state.isPlaying,
              isLoading: partial.isLoading ?? state.isLoading,
              position: partial.position ?? state.position,
              duration:
                partial.duration !== undefined && partial.duration > 0
                  ? partial.duration
                  : state.duration,
              activeEngine: partial.activeEngine ?? state.activeEngine,
            }));
          },
          onEnded: () => {
            const { repeat, currentTrack } = get();
            if (repeat === 'one' && currentTrack) {
              void playerEngine.seek(0);
              void playerEngine.resume();
            } else {
              void get().nextTrack();
            }
          },
          onError: (message) => {
            set({ playbackError: message, isPlaying: false, isLoading: false });
            get().showToast(message);
          },
          onNext: () => void get().nextTrack(),
          onPrev: () => void get().prevTrack(),
          getSpotifyAccessToken: () => get().getValidSpotifyToken(),
          getSpotifyPlaybackMode: () => get().settings.spotifyPlaybackMode,
          getYouTubeApiKey: () => get().settings.youtubeApiKey,
          onSpotifyDeviceStatus: (ready, name) => {
            set({ spotifyDeviceReady: ready, spotifyDeviceName: name ?? null });
          },
        });
        playerEngine.setVolume(get().isMuted ? 0 : get().volume);
      },

      playTrack: async (track, contextQueue) => {
        const state = get();
        let nextQueue = state.queue;
        let nextIndex = state.queueIndex;

        if (contextQueue && contextQueue.length > 0) {
          nextQueue = contextQueue;
          nextIndex = contextQueue.findIndex((t) => t.id === track.id);
          if (nextIndex === -1) {
            nextQueue = [track, ...contextQueue];
            nextIndex = 0;
          }
        } else {
          const existingIdx = state.queue.findIndex((t) => t.id === track.id);
          if (existingIdx !== -1) {
            nextIndex = existingIdx;
          } else {
            nextQueue = [...state.queue, track];
            nextIndex = nextQueue.length - 1;
          }
        }

        const recent = [
          track,
          ...state.recentTracks.filter((t) => t.id !== track.id),
        ].slice(0, 30);

        set({
          currentTrack: track,
          queue: nextQueue,
          queueIndex: nextIndex,
          position: 0,
          duration: track.duration || 0,
          playbackError: null,
          isLoading: true,
          recentTracks: recent,
        });

        await playerEngine.playTrack(track);
      },

      togglePlayPause: async () => {
        const { isPlaying, currentTrack } = get();
        if (!currentTrack) return;
        if (isPlaying) {
          await playerEngine.pause();
          set({ isPlaying: false });
        } else {
          await playerEngine.resume();
          set({ isPlaying: true });
        }
      },

      nextTrack: async () => {
        const { queue, queueIndex, shuffle, repeat } = get();
        if (queue.length === 0) return;

        let nextIdx = queueIndex + 1;
        if (shuffle && queue.length > 1) {
          do {
            nextIdx = Math.floor(Math.random() * queue.length);
          } while (nextIdx === queueIndex);
        } else if (nextIdx >= queue.length) {
          if (repeat === 'all') {
            nextIdx = 0;
          } else {
            set({ isPlaying: false });
            return;
          }
        }

        const track = queue[nextIdx];
        if (!track) return;
        set({
          currentTrack: track,
          queueIndex: nextIdx,
          position: 0,
          duration: track.duration || 0,
          playbackError: null,
          isLoading: true,
        });
        await playerEngine.playTrack(track);
      },

      prevTrack: async () => {
        const { queue, queueIndex, position } = get();
        if (queue.length === 0) return;

        if (position > 4) {
          await playerEngine.seek(0);
          set({ position: 0 });
          return;
        }

        const prevIdx = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
        const track = queue[prevIdx];
        if (!track) return;
        set({
          currentTrack: track,
          queueIndex: prevIdx,
          position: 0,
          duration: track.duration || 0,
          playbackError: null,
          isLoading: true,
        });
        await playerEngine.playTrack(track);
      },

      seek: async (seconds) => {
        set({ position: seconds });
        await playerEngine.seek(seconds);
      },

      setVolume: (vol) => {
        const clamped = Math.max(0, Math.min(1, vol));
        set({ volume: clamped, isMuted: clamped === 0 });
        playerEngine.setVolume(clamped);
      },

      toggleMute: () => {
        const { isMuted, volume } = get();
        const nextMuted = !isMuted;
        set({ isMuted: nextMuted });
        playerEngine.setVolume(nextMuted ? 0 : volume || 0.5);
      },

      toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),

      cycleRepeat: () =>
        set((s) => ({
          repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off',
        })),

      addToQueue: (track) => {
        set((s) => ({ queue: [...s.queue, track] }));
        get().showToast(`„${track.title}“ zur Warteschlange hinzugefügt`);
      },

      removeFromQueue: (index) =>
        set((s) => {
          const next = s.queue.filter((_, i) => i !== index);
          const nextIdx = index < s.queueIndex ? s.queueIndex - 1 : s.queueIndex;
          return { queue: next, queueIndex: nextIdx };
        }),

      clearQueue: () => set({ queue: [], queueIndex: -1 }),

      toggleLike: (track) => {
        const exists = get().likedTracks.some((t) => t.id === track.id);
        set((s) => ({
          likedTracks: exists
            ? s.likedTracks.filter((t) => t.id !== track.id)
            : [{ ...track, addedAt: Date.now() }, ...s.likedTracks],
        }));
        get().showToast(exists ? 'Aus Favoriten entfernt' : 'Zu Favoriten hinzugefügt');
      },

      isLiked: (trackId) => get().likedTracks.some((t) => t.id === trackId),

      createPlaylist: (name, description) => {
        const now = Date.now();
        const pl: Playlist = {
          id: `pl-${now}-${Math.random().toString(36).slice(2, 6)}`,
          name: name.trim() || 'Neue Playlist',
          description,
          tracks: [],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ playlists: [pl, ...s.playlists] }));
        get().showToast(`Playlist „${pl.name}“ erstellt`);
        return pl;
      },

      deletePlaylist: (playlistId) =>
        set((s) => ({
          playlists: s.playlists.filter((p) => p.id !== playlistId),
          activeView: s.selectedPlaylistId === playlistId ? 'library' : s.activeView,
          selectedPlaylistId: s.selectedPlaylistId === playlistId ? null : s.selectedPlaylistId,
        })),

      addTrackToPlaylist: (playlistId, track) => {
        set((s) => ({
          playlists: s.playlists.map((p) => {
            if (p.id !== playlistId) return p;
            if (p.tracks.some((t) => t.id === track.id)) return p;
            return {
              ...p,
              cover: p.cover || track.artwork,
              tracks: [...p.tracks, { ...track, addedAt: Date.now() }],
              updatedAt: Date.now(),
            };
          }),
        }));
        const pl = get().playlists.find((p) => p.id === playlistId);
        if (pl) get().showToast(`Zu „${pl.name}“ hinzugefügt`);
      },

      removeTrackFromPlaylist: (playlistId, trackId) =>
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === playlistId
              ? { ...p, tracks: p.tracks.filter((t) => t.id !== trackId), updatedAt: Date.now() }
              : p
          ),
        })),

      importPlaylists: (incoming) =>
        set((s) => {
          const existingIds = new Set(s.playlists.map((p) => p.id));
          const merged = [
            ...s.playlists.map((existing) => {
              const updated = incoming.find((i) => i.id === existing.id);
              return updated ? { ...existing, ...updated, tracks: updated.tracks.length ? updated.tracks : existing.tracks } : existing;
            }),
            ...incoming.filter((i) => !existingIds.has(i.id)),
          ];
          return { playlists: merged };
        }),

      mergeLikedTracks: (tracks) =>
        set((s) => {
          const seen = new Set(s.likedTracks.map((t) => t.id));
          const added = tracks.filter((t) => !seen.has(t.id));
          return { likedTracks: [...added, ...s.likedTracks] };
        }),

      setLocalTracks: (tracks) => set({ localTracks: tracks }),

      addLocalTracks: (tracks) =>
        set((s) => {
          const seen = new Set(s.localTracks.map((t) => t.id));
          return { localTracks: [...s.localTracks, ...tracks.filter((t) => !seen.has(t.id))] };
        }),

      addRadioStation: (station) =>
        set((s) => ({
          radioStations: [station, ...s.radioStations.filter((r) => r.id !== station.id)],
        })),

      setSpotifyAuth: (auth) => {
        set({ spotifyAuth: auth });
        void playerEngine.initSpotifySdk();
      },

      logoutSpotify: () =>
        set({
          spotifyAuth: { accessToken: null, refreshToken: null, expiresAt: 0, profile: null },
          spotifyDeviceReady: false,
          spotifyDeviceName: null,
        }),

      getValidSpotifyToken: async () => {
        const { spotifyAuth, settings } = get();
        if (!spotifyAuth.accessToken) return null;
        if (Date.now() < spotifyAuth.expiresAt) return spotifyAuth.accessToken;

        if (spotifyAuth.refreshToken && settings.spotifyClientId) {
          try {
            const refreshed = await refreshSpotifyToken(
              settings.spotifyClientId,
              spotifyAuth.refreshToken
            );
            set((s) => ({
              spotifyAuth: {
                ...s.spotifyAuth,
                ...refreshed,
              },
            }));
            return refreshed.accessToken ?? null;
          } catch {
            return null;
          }
        }
        return spotifyAuth.accessToken;
      },

      updateSettings: (partial) =>
        set((s) => ({ settings: { ...s.settings, ...partial } })),

      setActiveView: (view, playlistId) =>
        set({ activeView: view, selectedPlaylistId: playlistId ?? null }),

      setShowQueuePanel: (open) => set({ showQueuePanel: open }),
      setShowMobilePlayer: (open) => set({ showMobilePlayer: open }),
      setShowVideoOverlay: (open) => set({ showVideoOverlay: open }),

      showToast: (message) => {
        if (toastTimer !== null) clearTimeout(toastTimer);
        set({ toastMessage: message });
        toastTimer = window.setTimeout(() => {
          set({ toastMessage: null });
        }, 3200);
      },
    }),
    {
      name: 'omniplay-store-v1',
      partialize: (state) => ({
        volume: state.volume,
        shuffle: state.shuffle,
        repeat: state.repeat,
        likedTracks: state.likedTracks,
        playlists: state.playlists,
        localTracks: state.localTracks.filter((t) => !t.streamUrl?.startsWith('blob:')),
        radioStations: state.radioStations,
        recentTracks: state.recentTracks,
        spotifyAuth: state.spotifyAuth,
        settings: state.settings,
      }),
    }
  )
);
