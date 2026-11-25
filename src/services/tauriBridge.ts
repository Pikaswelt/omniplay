import type { Track } from '@/types/music';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export function isTauri(): boolean {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
}

async function invokeTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

export async function openExternalUrl(url: string): Promise<void> {
  if (isTauri()) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
      return;
    } catch {
      // Fallback below
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function convertLocalAudioUrl(filePath: string): Promise<string> {
  if (!isTauri()) return filePath;
  const { convertFileSrc } = await import('@tauri-apps/api/core');
  return convertFileSrc(filePath);
}

export async function pickLocalFolder(): Promise<string | null> {
  if (!isTauri()) return null;
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    directory: true,
    multiple: false,
    title: 'Musik-Ordner für OmniPlay auswählen',
  });
  return typeof selected === 'string' ? selected : null;
}

export async function scanLocalFolderNative(folderPath: string): Promise<Track[]> {
  if (!isTauri()) return [];
  return invokeTauri<Track[]>('scan_local_folder', { path: folderPath });
}

export async function searchYouTubeNative(query: string, musicOnly = true): Promise<Track[]> {
  if (!isTauri()) return [];
  return invokeTauri<Track[]>('search_youtube', { query, musicOnly });
}

export async function searchSoundCloudNative(query: string): Promise<Track[]> {
  if (!isTauri()) return [];
  return invokeTauri<Track[]>('search_soundcloud', { query });
}

export async function resolveUrlNative(url: string): Promise<Track | null> {
  if (!isTauri()) return null;
  return invokeTauri<Track | null>('resolve_track_url', { url });
}

export async function awaitSpotifyOAuthCallback(port = 17420): Promise<string> {
  if (!isTauri()) {
    throw new Error('Lokaler OAuth-Callback-Server ist nur in der Desktop-App verfügbar.');
  }
  return invokeTauri<string>('await_spotify_oauth_callback', { port });
}
