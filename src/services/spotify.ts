import type { Playlist, SpotifyAuthState, SpotifyUserProfile, Track } from '@/types/music';
import { isTauri } from './tauriBridge';

const SPOTIFY_AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export const SPOTIFY_SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ');

export const SPOTIFY_LOCAL_PORT = 17420;

export function getSpotifyRedirectUri(): string {
  if (isTauri()) {
    return `http://127.0.0.1:${SPOTIFY_LOCAL_PORT}/callback`;
  }
  return `${window.location.origin}/callback`;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generateCodeVerifier(length = 64): string {
  const random = new Uint8Array(length);
  crypto.getRandomValues(random);
  return base64UrlEncode(random).slice(0, length);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

export async function createSpotifyLoginRequest(clientId: string): Promise<{
  authUrl: string;
  verifier: string;
  redirectUri: string;
}> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const redirectUri = getSpotifyRedirectUri();

  sessionStorage.setItem('omniplay_spotify_verifier', verifier);
  sessionStorage.setItem('omniplay_spotify_client_id', clientId);

  const params = new URLSearchParams({
    client_id: clientId.trim(),
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SPOTIFY_SCOPES,
  });

  return {
    authUrl: `${SPOTIFY_AUTH_ENDPOINT}?${params.toString()}`,
    verifier,
    redirectUri,
  };
}

export async function exchangeSpotifyCode(
  clientId: string,
  code: string,
  verifier: string,
  redirectUri = getSpotifyRedirectUri()
): Promise<SpotifyAuthState> {
  const body = new URLSearchParams({
    client_id: clientId.trim(),
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  const res = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Spotify Token-Fehler (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const expiresAt = Date.now() + (data.expires_in - 60) * 1000;
  const profile = await fetchSpotifyProfile(data.access_token);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt,
    profile,
  };
}

export async function refreshSpotifyToken(
  clientId: string,
  refreshToken: string
): Promise<Partial<SpotifyAuthState>> {
  const body = new URLSearchParams({
    client_id: clientId.trim(),
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const res = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    throw new Error(`Spotify Token-Refresh fehlgeschlagen (${res.status})`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
}

async function spotifyFetch<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SPOTIFY_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Spotify API ${res.status}: ${text || res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchSpotifyProfile(accessToken: string): Promise<SpotifyUserProfile> {
  const data = await spotifyFetch<{
    id: string;
    display_name?: string;
    email?: string;
    product?: string;
    images?: { url: string }[];
  }>(accessToken, '/me');

  return {
    id: data.id,
    displayName: data.display_name || data.id,
    email: data.email,
    product: data.product,
    avatar: data.images?.[0]?.url,
  };
}

interface RawSpotifyTrack {
  id: string;
  uri: string;
  name: string;
  duration_ms: number;
  external_urls?: { spotify?: string };
  artists?: { name: string }[];
  album?: {
    name?: string;
    images?: { url: string }[];
  };
}

function mapSpotifyTrack(raw: RawSpotifyTrack): Track {
  return {
    id: `spotify:${raw.id}`,
    source: 'spotify',
    sourceId: raw.id,
    spotifyUri: raw.uri,
    title: raw.name,
    artist: raw.artists?.map((a) => a.name).join(', ') || 'Unbekannter Künstler',
    album: raw.album?.name,
    duration: Math.round((raw.duration_ms || 0) / 1000),
    artwork: raw.album?.images?.[0]?.url || raw.album?.images?.[1]?.url,
    url: raw.external_urls?.spotify || `https://open.spotify.com/track/${raw.id}`,
  };
}

export async function searchSpotifyTracks(accessToken: string, query: string, limit = 15): Promise<Track[]> {
  const q = encodeURIComponent(query);
  const data = await spotifyFetch<{ tracks?: { items: RawSpotifyTrack[] } }>(
    accessToken,
    `/search?q=${q}&type=track&limit=${limit}`
  );
  return (data.tracks?.items ?? []).filter((t) => Boolean(t?.id)).map(mapSpotifyTrack);
}

export async function fetchSpotifyTrackById(accessToken: string, trackId: string): Promise<Track> {
  const raw = await spotifyFetch<RawSpotifyTrack>(accessToken, `/tracks/${trackId}`);
  return mapSpotifyTrack(raw);
}

export async function fetchSpotifyLikedTracks(accessToken: string, limit = 50): Promise<Track[]> {
  const data = await spotifyFetch<{ items: { track: RawSpotifyTrack | null }[] }>(
    accessToken,
    `/me/tracks?limit=${limit}`
  );
  return (data.items ?? [])
    .map((item) => item.track)
    .filter((t): t is RawSpotifyTrack => Boolean(t?.id))
    .map(mapSpotifyTrack);
}

export async function fetchSpotifyPlaylists(accessToken: string): Promise<Playlist[]> {
  const data = await spotifyFetch<{
    items: {
      id: string;
      name: string;
      description?: string;
      images?: { url: string }[];
    }[];
  }>(accessToken, '/me/playlists?limit=30');

  const now = Date.now();
  return (data.items ?? []).map((p) => ({
    id: `sp-pl-${p.id}`,
    name: p.name,
    description: p.description || 'Importiert von Spotify',
    cover: p.images?.[0]?.url,
    tracks: [],
    createdAt: now,
    updatedAt: now,
    syncedFrom: 'spotify',
    spotifyPlaylistId: p.id,
  }));
}

export async function fetchSpotifyPlaylistTracks(accessToken: string, playlistId: string): Promise<Track[]> {
  const data = await spotifyFetch<{ items: { track: RawSpotifyTrack | null }[] }>(
    accessToken,
    `/playlists/${playlistId}/tracks?limit=100`
  );
  return (data.items ?? [])
    .map((item) => item.track)
    .filter((t): t is RawSpotifyTrack => Boolean(t?.id))
    .map(mapSpotifyTrack);
}

export interface SpotifyDevice {
  id: string;
  is_active: boolean;
  name: string;
  type: string;
  volume_percent: number;
}

export async function fetchSpotifyDevices(accessToken: string): Promise<SpotifyDevice[]> {
  const data = await spotifyFetch<{ devices: SpotifyDevice[] }>(accessToken, '/me/player/devices');
  return data.devices ?? [];
}

export async function spotifyTransferAndPlay(
  accessToken: string,
  spotifyUri: string,
  deviceId?: string
): Promise<void> {
  const query = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
  await spotifyFetch<void>(accessToken, `/me/player/play${query}`, {
    method: 'PUT',
    body: JSON.stringify({ uris: [spotifyUri] }),
  });
}

export async function spotifyConnectPause(accessToken: string, deviceId?: string): Promise<void> {
  const query = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
  await spotifyFetch<void>(accessToken, `/me/player/pause${query}`, { method: 'PUT' });
}

export async function spotifyConnectResume(accessToken: string, deviceId?: string): Promise<void> {
  const query = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
  await spotifyFetch<void>(accessToken, `/me/player/play${query}`, { method: 'PUT' });
}

export async function spotifyConnectSeek(accessToken: string, positionMs: number, deviceId?: string): Promise<void> {
  const deviceParam = deviceId ? `&device_id=${encodeURIComponent(deviceId)}` : '';
  await spotifyFetch<void>(
    accessToken,
    `/me/player/seek?position_ms=${Math.max(0, Math.round(positionMs))}${deviceParam}`,
    { method: 'PUT' }
  );
}

export async function spotifyConnectVolume(accessToken: string, volumePercent: number, deviceId?: string): Promise<void> {
  const vol = Math.max(0, Math.min(100, Math.round(volumePercent)));
  const deviceParam = deviceId ? `&device_id=${encodeURIComponent(deviceId)}` : '';
  await spotifyFetch<void>(accessToken, `/me/player/volume?volume_percent=${vol}${deviceParam}`, {
    method: 'PUT',
  });
}
