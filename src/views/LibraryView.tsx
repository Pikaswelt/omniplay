import { useState } from 'react';
import { Disc3, Download, Heart, Loader2, Play, Plus, Trash2 } from 'lucide-react';
import { useMusicStore } from '@/store/useMusicStore';
import {
  fetchSpotifyLikedTracks,
  fetchSpotifyPlaylists,
  fetchSpotifyPlaylistTracks,
} from '@/services/spotify';

export function LibraryView() {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [syncing, setSyncing] = useState(false);

  const playlists = useMusicStore((s) => s.playlists);
  const likedTracks = useMusicStore((s) => s.likedTracks);
  const spotifyLoggedIn = useMusicStore((s) => Boolean(s.spotifyAuth.accessToken));
  const getValidSpotifyToken = useMusicStore((s) => s.getValidSpotifyToken);
  const createPlaylist = useMusicStore((s) => s.createPlaylist);
  const deletePlaylist = useMusicStore((s) => s.deletePlaylist);
  const importPlaylists = useMusicStore((s) => s.importPlaylists);
  const mergeLikedTracks = useMusicStore((s) => s.mergeLikedTracks);
  const setActiveView = useMusicStore((s) => s.setActiveView);
  const playTrack = useMusicStore((s) => s.playTrack);
  const showToast = useMusicStore((s) => s.showToast);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const pl = createPlaylist(name, desc || undefined);
    setName('');
    setDesc('');
    setCreating(false);
    setActiveView('playlist', pl.id);
  };

  const handleSyncSpotify = async () => {
    const token = await getValidSpotifyToken();
    if (!token) {
      showToast('Bitte zuerst in den Einstellungen mit Spotify verbinden.');
      setActiveView('settings');
      return;
    }
    setSyncing(true);
    try {
      const [spPlaylists, spLiked] = await Promise.all([
        fetchSpotifyPlaylists(token),
        fetchSpotifyLikedTracks(token, 50),
      ]);

      // Fetch tracks for first 8 Spotify playlists immediately
      const hydrated = await Promise.all(
        spPlaylists.map(async (pl, idx) => {
          if (idx < 8 && pl.spotifyPlaylistId) {
            const tracks = await fetchSpotifyPlaylistTracks(token, pl.spotifyPlaylistId).catch(
              () => []
            );
            return { ...pl, tracks };
          }
          return pl;
        })
      );

      importPlaylists(hydrated);
      mergeLikedTracks(spLiked);
      showToast(
        `${hydrated.length} Spotify Playlists & ${spLiked.length} Lieblingssongs importiert!`
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Spotify Sync fehlgeschlagen');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Deine Mediathek</h2>
          <p className="text-sm text-zinc-400">
            Gemischte Playlists aus Spotify, YouTube Music, SoundCloud & lokalen Songs.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {spotifyLoggedIn && (
            <button
              onClick={() => void handleSyncSpotify()}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Spotify Mediathek importieren
            </button>
          )}
          <button
            onClick={() => setCreating((c) => !c)}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200"
          >
            <Plus className="h-4 w-4" />
            Neue Playlist
          </button>
        </div>
      </div>

      {creating && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-3"
        >
          <h3 className="text-sm font-semibold text-white">Neue gemischte Playlist</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name der Playlist (z. B. Gym Mix)"
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
            />
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Beschreibung (optional)"
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-xl px-4 py-2 text-xs text-zinc-400 hover:bg-zinc-800"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400"
            >
              Erstellen
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {/* Liked Card */}
        <div
          onClick={() => setActiveView('liked')}
          className="group flex cursor-pointer flex-col rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-600/25 via-zinc-900 to-cyan-600/20 p-4 hover:border-emerald-500/40 transition-all"
        >
          <div className="mb-4 flex aspect-square items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-zinc-950 shadow-xl">
            <Heart className="h-12 w-12 fill-current" />
          </div>
          <div className="truncate font-bold text-white">Lieblingssongs</div>
          <div className="text-xs text-zinc-400">{likedTracks.length} Titel</div>
        </div>

        {/* Playlists */}
        {playlists.map((pl) => (
          <div
            key={pl.id}
            onClick={() => setActiveView('playlist', pl.id)}
            className="group relative flex cursor-pointer flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 hover:bg-zinc-800/70 transition-all"
          >
            <div className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-zinc-800">
              {pl.cover || pl.tracks[0]?.artwork ? (
                <img
                  src={pl.cover || pl.tracks[0]?.artwork}
                  alt={pl.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-600">
                  <Disc3 className="h-12 w-12" />
                </div>
              )}

              {pl.tracks[0] && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void playTrack(pl.tracks[0], pl.tracks);
                  }}
                  className="absolute bottom-2.5 right-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-zinc-950 opacity-0 shadow-xl transition-all group-hover:opacity-100 hover:scale-105"
                >
                  <Play className="h-5 w-5 fill-current ml-0.5" />
                </button>
              )}
            </div>

            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{pl.name}</div>
                <div className="text-xs text-zinc-400">
                  {pl.tracks.length} Titel
                  {pl.syncedFrom === 'spotify' ? ' • Spotify' : ''}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deletePlaylist(pl.id);
                }}
                className="rounded-lg p-1 text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-all"
                title="Playlist löschen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
