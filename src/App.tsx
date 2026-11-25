import { useEffect } from 'react';
import { Disc3, X } from 'lucide-react';
import { useMusicStore } from '@/store/useMusicStore';
import { exchangeSpotifyCode, getSpotifyRedirectUri } from '@/services/spotify';
import { Sidebar } from '@/components/Sidebar';
import { PlayerBar } from '@/components/PlayerBar';
import { QueuePanel } from '@/components/QueuePanel';
import { MobileNav } from '@/components/MobileNav';
import { MobileNowPlaying } from '@/components/MobileNowPlaying';
import { HomeView } from '@/views/HomeView';
import { SearchView } from '@/views/SearchView';
import { LibraryView } from '@/views/LibraryView';
import { PlaylistDetailView } from '@/views/PlaylistDetailView';
import { LocalMusicView } from '@/views/LocalMusicView';
import { RadioView } from '@/views/RadioView';
import { SettingsView } from '@/views/SettingsView';

export function App() {
  const initEngine = useMusicStore((s) => s.initEngine);
  const activeView = useMusicStore((s) => s.activeView);
  const setActiveView = useMusicStore((s) => s.setActiveView);
  const togglePlayPause = useMusicStore((s) => s.togglePlayPause);
  const toggleMute = useMusicStore((s) => s.toggleMute);
  const seek = useMusicStore((s) => s.seek);
  const position = useMusicStore((s) => s.position);
  const setSpotifyAuth = useMusicStore((s) => s.setSpotifyAuth);
  const showToast = useMusicStore((s) => s.showToast);
  const toastMessage = useMusicStore((s) => s.toastMessage);
  const showVideoOverlay = useMusicStore((s) => s.showVideoOverlay);
  const setShowVideoOverlay = useMusicStore((s) => s.setShowVideoOverlay);

  // Initialize unified player engine once
  useEffect(() => {
    initEngine();
  }, [initEngine]);

  // Handle Spotify Web OAuth redirect callback (/callback?code=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;

    const verifier = sessionStorage.getItem('omniplay_spotify_verifier');
    const clientId =
      sessionStorage.getItem('omniplay_spotify_client_id') ||
      useMusicStore.getState().settings.spotifyClientId;

    if (verifier && clientId) {
      window.history.replaceState({}, document.title, '/');
      exchangeSpotifyCode(clientId, code, verifier, getSpotifyRedirectUri())
        .then((auth) => {
          setSpotifyAuth(auth);
          showToast(`Mit Spotify verbunden: ${auth.profile?.displayName || 'Premium'}`);
          setActiveView('home');
        })
        .catch((err) => {
          showToast(err instanceof Error ? err.message : 'Spotify Login fehlgeschlagen');
        });
    }
  }, [setSpotifyAuth, showToast, setActiveView]);

  // Global keyboard shortcuts (Space, Ctrl+K, M, ArrowLeft/Right)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActiveView('search');
        return;
      }

      if (isTyping) return;

      if (e.code === 'Space') {
        e.preventDefault();
        void togglePlayPause();
      } else if (e.key.toLowerCase() === 'm') {
        toggleMute();
      } else if (e.key === 'ArrowRight') {
        void seek(position + 10);
      } else if (e.key === 'ArrowLeft') {
        void seek(Math.max(0, position - 10));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePlayPause, toggleMute, seek, position, setActiveView]);

  // Toggle visibility & docking of YouTube player slot for Mini-Video mode
  useEffect(() => {
    const slot = document.getElementById('omniplay-yt-player-slot');
    if (!slot) return;
    if (showVideoOverlay) {
      slot.style.cssText =
        'position:fixed;bottom:100px;right:20px;width:360px;height:203px;opacity:1;pointer-events:auto;z-index:45;border-radius:16px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.8);border:1px solid rgba(255,255,255,0.12);background:#000;';
    } else {
      slot.style.cssText =
        'position:fixed;bottom:0;right:0;width:320px;height:180px;opacity:0;pointer-events:none;z-index:-1;';
    }
  }, [showVideoOverlay]);

  const renderView = () => {
    switch (activeView) {
      case 'home':
        return <HomeView />;
      case 'search':
        return <SearchView />;
      case 'library':
        return <LibraryView />;
      case 'liked':
        return <PlaylistDetailView mode="liked" />;
      case 'playlist':
        return <PlaylistDetailView mode="playlist" />;
      case 'local':
        return <LocalMusicView />;
      case 'radio':
        return <RadioView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Main Workspace */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Mobile Top Header */}
          <header className="md:hidden flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-3 backdrop-blur-xl">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 via-cyan-500 to-violet-500">
                <Disc3 className="h-4 w-4 text-zinc-950" />
              </div>
              <span className="text-base font-bold text-white">OmniPlay</span>
            </div>
            <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[10px] font-medium text-zinc-400">
              All-in-One
            </span>
          </header>

          {/* Main Scrollable Content */}
          <main className="flex-1 overflow-y-auto px-4 pt-5 pb-36 md:px-8 md:pt-7 md:pb-8">
            <div className="mx-auto max-w-6xl">{renderView()}</div>
          </main>
        </div>

        <QueuePanel />
      </div>

      {/* Persistent Player Bar (Desktop + Mobile Mini) */}
      <PlayerBar />

      {/* Mobile Bottom Navigation & Fullscreen Sheet */}
      <MobileNav />
      <MobileNowPlaying />

      {/* Mini-Video Close Button when Video Overlay is visible */}
      {showVideoOverlay && (
        <button
          onClick={() => setShowVideoOverlay(false)}
          className="fixed bottom-[310px] right-[20px] z-50 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900/90 text-zinc-200 border border-zinc-700 hover:bg-zinc-800 shadow-lg"
          title="Video schließen (Audio läuft weiter)"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-36 md:bottom-26 left-1/2 z-50 -translate-x-1/2 rounded-full border border-zinc-700 bg-zinc-900/95 px-4 py-2 text-xs font-medium text-white shadow-2xl backdrop-blur-xl">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default App;
