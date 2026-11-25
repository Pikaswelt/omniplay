import type { SourceType, Track } from '@/types/music';
import {
  isTauri,
  resolveUrlNative,
  searchSoundCloudNative,
  searchYouTubeNative,
} from './tauriBridge';
import { fetchSpotifyTrackById, searchSpotifyTracks } from './spotify';

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://api.piped.private.coffee',
];

export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|music\.youtube\.com\/watch\?v=|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/,
  ];
  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function extractSpotifyTrackId(input: string): string | null {
  const match = input.trim().match(/(?:open\.spotify\.com\/(?:intl-[a-z]+\/)?track\/|spotify:track:)([A-Za-z0-9]{22})/);
  return match?.[1] ?? null;
}

export function isSoundCloudUrl(input: string): boolean {
  return /^https?:\/\/(m\.|www\.|on\.)?soundcloud\.com\/.+/i.test(input.trim());
}

export function isDirectAudioUrl(input: string): boolean {
  return /^https?:\/\/.+\.(mp3|flac|wav|ogg|m4a|aac|opus|m3u8)(\?.*)?$/i.test(input.trim());
}

export async function searchYouTube(
  query: string,
  youtubeApiKey?: string,
  musicOnly = true
): Promise<Track[]> {
  // 1. Official YouTube Data API v3 if user configured a key
  if (youtubeApiKey?.trim()) {
    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/search');
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('type', 'video');
      url.searchParams.set('maxResults', '12');
      if (musicOnly) url.searchParams.set('videoCategoryId', '10');
      url.searchParams.set('q', query);
      url.searchParams.set('key', youtubeApiKey.trim());

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        return (data.items ?? []).map(
          (item: {
            id: { videoId: string };
            snippet: {
              title: string;
              channelTitle: string;
              thumbnails?: { high?: { url: string }; medium?: { url: string } };
            };
          }): Track => ({
            id: `youtube:${item.id.videoId}`,
            source: 'youtube',
            sourceId: item.id.videoId,
            title: decodeHtmlEntities(item.snippet.title),
            artist: item.snippet.channelTitle,
            duration: 0,
            artwork:
              item.snippet.thumbnails?.high?.url ||
              item.snippet.thumbnails?.medium?.url ||
              `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`,
            url: `https://music.youtube.com/watch?v=${item.id.videoId}`,
          })
        );
      }
    } catch {
      // Fallback below
    }
  }

  // 2. Native Rust Innertube search in Tauri (no CORS, zero API key needed)
  if (isTauri()) {
    try {
      const nativeResults = await searchYouTubeNative(query, musicOnly);
      if (nativeResults.length > 0) return nativeResults;
    } catch {
      // Fallback to Piped instances
    }
  }

  // 3. Public Piped API fallback (works in Web/PWA too)
  const filter = musicOnly ? 'music_songs' : 'videos';
  for (const instance of PIPED_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(
        `${instance}/search?q=${encodeURIComponent(query)}&filter=${filter}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      if (!res.ok) continue;

      const data = await res.json();
      const items = (data.items ?? []).filter((i: { url?: string }) => i.url?.includes('v='));
      if (items.length > 0) {
        return items.slice(0, 15).map(
          (item: {
            url: string;
            title: string;
            uploaderName?: string;
            duration?: number;
            thumbnail?: string;
          }): Track => {
            const vid = item.url.split('v=')[1]?.split('&')[0] ?? '';
            return {
              id: `youtube:${vid}`,
              source: 'youtube',
              sourceId: vid,
              title: item.title,
              artist: item.uploaderName || 'YouTube Music',
              duration: item.duration && item.duration > 0 ? item.duration : 0,
              artwork: item.thumbnail || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
              url: `https://music.youtube.com/watch?v=${vid}`,
            };
          }
        );
      }
    } catch {
      continue;
    }
  }

  return [];
}

export async function searchSoundCloud(query: string): Promise<Track[]> {
  if (isTauri()) {
    try {
      const results = await searchSoundCloudNative(query);
      if (results.length > 0) return results;
    } catch {
      // Fallback below
    }
  }

  // If user entered a direct SoundCloud link
  if (isSoundCloudUrl(query)) {
    const resolved = await resolveSoundCloudUrl(query);
    return resolved ? [resolved] : [];
  }

  return [];
}

export async function resolveSoundCloudUrl(url: string): Promise<Track | null> {
  try {
    const res = await fetch(
      `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url.trim())}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const cleanUrl = url.trim();
    return {
      id: `soundcloud:${btoa(cleanUrl).replace(/[^A-Za-z0-9]/g, '').slice(0, 20)}`,
      source: 'soundcloud',
      sourceId: cleanUrl,
      title: data.title || 'SoundCloud Track',
      artist: data.author_name || 'SoundCloud',
      duration: 0,
      artwork: data.thumbnail_url,
      url: cleanUrl,
    };
  } catch {
    return null;
  }
}

export async function resolveDirectUrlOrQuery(
  input: string,
  spotifyAccessToken?: string | null
): Promise<Track | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Spotify URL
  const spId = extractSpotifyTrackId(trimmed);
  if (spId) {
    if (spotifyAccessToken) {
      try {
        return await fetchSpotifyTrackById(spotifyAccessToken, spId);
      } catch {
        // fallback stub
      }
    }
    return {
      id: `spotify:${spId}`,
      source: 'spotify',
      sourceId: spId,
      spotifyUri: `spotify:track:${spId}`,
      title: 'Spotify Track',
      artist: 'Spotify',
      duration: 0,
      url: `https://open.spotify.com/track/${spId}`,
    };
  }

  // YouTube URL
  if (trimmed.includes('youtu')) {
    const ytId = extractYouTubeId(trimmed);
    if (ytId) {
      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`
        );
        if (res.ok) {
          const data = await res.json();
          return {
            id: `youtube:${ytId}`,
            source: 'youtube',
            sourceId: ytId,
            title: data.title || 'YouTube Track',
            artist: data.author_name || 'YouTube',
            duration: 0,
            artwork: data.thumbnail_url || `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
            url: `https://music.youtube.com/watch?v=${ytId}`,
          };
        }
      } catch {
        // ignore
      }
      return {
        id: `youtube:${ytId}`,
        source: 'youtube',
        sourceId: ytId,
        title: `YouTube (${ytId})`,
        artist: 'YouTube',
        duration: 0,
        artwork: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
        url: `https://music.youtube.com/watch?v=${ytId}`,
      };
    }
  }

  // SoundCloud URL
  if (isSoundCloudUrl(trimmed)) {
    const sc = await resolveSoundCloudUrl(trimmed);
    if (sc) return sc;
  }

  // Direct Audio / Radio Stream URL
  if (isDirectAudioUrl(trimmed) || /^https?:\/\//i.test(trimmed)) {
    if (isTauri()) {
      const native = await resolveUrlNative(trimmed).catch(() => null);
      if (native) return native;
    }
    if (isDirectAudioUrl(trimmed)) {
      const fileName = trimmed.split('/').pop()?.split('?')[0] || 'Audio Stream';
      return {
        id: `radio:${btoa(trimmed).slice(0, 16)}`,
        source: 'radio',
        sourceId: trimmed,
        title: decodeURIComponent(fileName),
        artist: 'Direct Audio Stream',
        duration: 0,
        streamUrl: trimmed,
        url: trimmed,
      };
    }
  }

  return null;
}

export interface UnifiedSearchResult {
  spotify: Track[];
  youtube: Track[];
  soundcloud: Track[];
  local: Track[];
  radio: Track[];
  resolvedUrlTrack: Track | null;
}

export async function unifiedSearch(params: {
  query: string;
  sources: SourceType[];
  spotifyAccessToken?: string | null;
  youtubeApiKey?: string;
  localTracks: Track[];
  radioStations: Track[];
}): Promise<UnifiedSearchResult> {
  const { query, sources, spotifyAccessToken, youtubeApiKey, localTracks, radioStations } = params;
  const trimmed = query.trim();

  if (!trimmed) {
    return { spotify: [], youtube: [], soundcloud: [], local: [], radio: [], resolvedUrlTrack: null };
  }

  const isUrl = /^https?:\/\/|^spotify:track:/i.test(trimmed);
  if (isUrl) {
    const resolvedUrlTrack = await resolveDirectUrlOrQuery(trimmed, spotifyAccessToken);
    return { spotify: [], youtube: [], soundcloud: [], local: [], radio: [], resolvedUrlTrack };
  }

  const lower = trimmed.toLowerCase();

  const localMatches = sources.includes('local')
    ? localTracks.filter(
        (t) =>
          t.title.toLowerCase().includes(lower) ||
          t.artist.toLowerCase().includes(lower) ||
          (t.album?.toLowerCase().includes(lower) ?? false)
      )
    : [];

  const radioMatches = sources.includes('radio')
    ? radioStations.filter(
        (t) => t.title.toLowerCase().includes(lower) || t.artist.toLowerCase().includes(lower)
      )
    : [];

  const [spotify, youtube, soundcloud] = await Promise.all([
    sources.includes('spotify') && spotifyAccessToken
      ? searchSpotifyTracks(spotifyAccessToken, trimmed).catch(() => [])
      : Promise.resolve([]),
    sources.includes('youtube')
      ? searchYouTube(trimmed, youtubeApiKey, true).catch(() => [])
      : Promise.resolve([]),
    sources.includes('soundcloud')
      ? searchSoundCloud(trimmed).catch(() => [])
      : Promise.resolve([]),
  ]);

  return {
    spotify,
    youtube,
    soundcloud,
    local: localMatches,
    radio: radioMatches,
    resolvedUrlTrack: null,
  };
}

function decodeHtmlEntities(input: string): string {
  const txt = document.createElement('textarea');
  txt.innerHTML = input;
  return txt.value;
}
