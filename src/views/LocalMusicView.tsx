import { useRef, useState } from 'react';
import { FolderOpen, FolderSearch, Loader2, Play, Upload } from 'lucide-react';
import type { Track } from '@/types/music';
import { useMusicStore } from '@/store/useMusicStore';
import { isTauri, pickLocalFolder, scanLocalFolderNative } from '@/services/tauriBridge';
import { TrackRow } from '@/components/TrackRow';

export function LocalMusicView() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);

  const localTracks = useMusicStore((s) => s.localTracks);
  const localFolders = useMusicStore((s) => s.settings.localFolders);
  const addLocalTracks = useMusicStore((s) => s.addLocalTracks);
  const setLocalTracks = useMusicStore((s) => s.setLocalTracks);
  const updateSettings = useMusicStore((s) => s.updateSettings);
  const playTrack = useMusicStore((s) => s.playTrack);
  const showToast = useMusicStore((s) => s.showToast);

  const handleScanNativeFolder = async () => {
    const folder = await pickLocalFolder();
    if (!folder) return;
    setScanning(true);
    try {
      const tracks = await scanLocalFolderNative(folder);
      addLocalTracks(tracks);
      if (!localFolders.includes(folder)) {
        updateSettings({ localFolders: [...localFolders, folder] });
      }
      showToast(`${tracks.length} lokale Audio-Dateien gefunden!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ordner-Scan fehlgeschlagen');
    } finally {
      setScanning(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const tracks: Track[] = files.map((file) => {
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      const parts = cleanName.split(' - ');
      const artist = parts.length > 1 ? parts[0].trim() : 'Lokale Datei';
      const title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : cleanName;
      const blobUrl = URL.createObjectURL(file);

      return {
        id: `local:${file.name}-${file.size}`,
        source: 'local',
        sourceId: blobUrl,
        streamUrl: blobUrl,
        title,
        artist,
        album: 'Lokal importiert',
        duration: 0,
      };
    });

    addLocalTracks(tracks);
    showToast(`${tracks.length} lokale Dateien geladen`);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Lokale Musik</h2>
          <p className="text-sm text-zinc-400">
            Spiele MP3, FLAC, WAV, OGG, M4A & OPUS direkt von deiner Festplatte oder deinem Handy.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isTauri() && (
            <button
              onClick={() => void handleScanNativeFolder()}
              disabled={scanning}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
            >
              {scanning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FolderSearch className="h-4 w-4" />
              )}
              Ordner scannen (Rust)
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800"
          >
            <Upload className="h-4 w-4" />
            Audio-Dateien wählen
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />

          {localTracks.length > 0 && (
            <button
              onClick={() => void playTrack(localTracks[0], localTracks)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400"
            >
              <Play className="h-4 w-4 fill-current" />
              Alle abspielen
            </button>
          )}
        </div>
      </div>

      {localFolders.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {localFolders.map((folder) => (
            <span
              key={folder}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400"
            >
              <FolderOpen className="h-3.5 w-3.5 text-violet-400" />
              {folder}
            </span>
          ))}
        </div>
      )}

      {localTracks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center">
          <FolderOpen className="mx-auto mb-3 h-10 w-10 text-zinc-600" />
          <p className="text-sm font-medium text-zinc-300">Noch keine lokalen Songs hinzugefügt</p>
          <p className="mt-1 text-xs text-zinc-500">
            In der Desktop-App liest der Rust-Scanner ID3/FLAC/MP4-Tags blitzschnell aus ganzen
            Ordnern aus.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-zinc-400">{localTracks.length} lokale Titel</span>
            <button
              onClick={() => setLocalTracks([])}
              className="text-xs text-zinc-500 hover:text-rose-400"
            >
              Liste leeren
            </button>
          </div>
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-2">
            {localTracks.map((track, idx) => (
              <TrackRow
                key={track.id}
                track={track}
                index={idx}
                contextQueue={localTracks}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
