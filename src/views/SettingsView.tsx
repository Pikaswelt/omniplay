import { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  LogOut,
  Monitor,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useMusicStore } from '@/store/useMusicStore';
import {
  createSpotifyLoginRequest,
  exchangeSpotifyCode,
  getSpotifyRedirectUri,
  SPOTIFY_LOCAL_PORT,
} from '@/services/spotify';
import {
  awaitSpotifyOAuthCallback,
  isTauri,
  openExternalUrl,
} from '@/services/tauriBridge';
import type { SpotifyPlaybackMode } from '@/types/music';

export function SettingsView() {
  const settings = useMusicStore((s) => s.settings);
  const updateSettings = useMusicStore((s) => s.updateSettings);
  const spotifyAuth = useMusicStore((s) => s.spotifyAuth);
  const spotifyDeviceReady = useMusicStore((s) => s.spotifyDeviceReady);
  const spotifyDeviceName = useMusicStore((s) => s.spotifyDeviceName);
  const setSpotifyAuth = useMusicStore((s) => s.setSpotifyAuth);
  const logoutSpotify = useMusicStore((s) => s.logoutSpotify);
  const showToast = useMusicStore((s) => s.showToast);

  const [connecting, setConnecting] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);
  const [manualCallbackUrl, setManualCallbackUrl] = useState('');

  const redirectUri = getSpotifyRedirectUri();

  const handleCopyRedirect = async () => {
    await navigator.clipboard.writeText(redirectUri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  const handleSpotifyConnect = async () => {
    const clientId = settings.spotifyClientId.trim();
    if (!clientId) {
      showToast('Bitte zuerst deine Spotify Client ID eintragen.');
      return;
    }

    setConnecting(true);
    try {
      const { authUrl, verifier, redirectUri: uri } = await createSpotifyLoginRequest(clientId);

      if (isTauri()) {
        // Start local Rust OAuth listener FIRST, then open system browser
        const callbackPromise = awaitSpotifyOAuthCallback(SPOTIFY_LOCAL_PORT);
        await openExternalUrl(authUrl);
        const code = await callbackPromise;
        const auth = await exchangeSpotifyCode(clientId, code, verifier, uri);
        setSpotifyAuth(auth);
        showToast(`Verbunden als ${auth.profile?.displayName || 'Spotify User'}!`);
      } else {
        window.location.href = authUrl;
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Spotify Login fehlgeschlagen');
    } finally {
      setConnecting(false);
    }
  };

  const handleManualCallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const verifier = sessionStorage.getItem('omniplay_spotify_verifier');
    const clientId = settings.spotifyClientId.trim();
    if (!verifier || !clientId) {
      showToast('Bitte zuerst auf „Mit Spotify Premium verbinden“ klicken.');
      return;
    }
    try {
      const parsed = new URL(manualCallbackUrl.trim());
      const code = parsed.searchParams.get('code');
      if (!code) throw new Error('Kein ?code= Parameter in der URL gefunden.');
      const auth = await exchangeSpotifyCode(clientId, code, verifier, redirectUri);
      setSpotifyAuth(auth);
      setManualCallbackUrl('');
      showToast(`Erfolgreich verbunden als ${auth.profile?.displayName}!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ungültige Callback-URL');
    }
  };

  const playbackModes: { id: SpotifyPlaybackMode; title: string; desc: string }[] = [
    {
      id: 'auto',
      title: 'Automatisch (Empfohlen)',
      desc: 'Nutzt Spotify Premium SDK direkt in der App (Windows/Web) → sonst Spotify Connect (Arch/Mobile) → sonst YouTube Audio Bridge.',
    },
    {
      id: 'sdk',
      title: 'Nur Spotify Web Playback SDK',
      desc: 'Spielt direkt über Widevine DRM in OmniPlay (ideal unter Windows & Chromium).',
    },
    {
      id: 'connect',
      title: 'Spotify Connect (librespot / spotifyd / Handy)',
      desc: 'Steuert dein aktives Spotify-Gerät (perfekt für Arch Linux mit spotifyd/librespot).',
    },
    {
      id: 'youtube-bridge',
      title: 'YouTube Music Audio Bridge',
      desc: 'Nutzt Spotify-Suche & Playlists, streamt Audio aber DRM-frei über YouTube Music.',
    },
  ];

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-white">Einstellungen & Quellen</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Verbinde deinen Spotify-Premium-Account und konfiguriere Wiedergabe-Engines.
        </p>
      </div>

      {/* Spotify Premium Section */}
      <section className="rounded-3xl border border-emerald-500/25 bg-zinc-900/70 p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Spotify Premium Integration</h3>
              <p className="text-xs text-zinc-400">
                OAuth 2.0 PKCE — kein Client Secret nötig, Token bleibt lokal auf deinem Gerät.
              </p>
            </div>
          </div>

          {spotifyAuth.profile && (
            <button
              onClick={logoutSpotify}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-rose-500/50 hover:text-rose-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              Abmelden
            </button>
          )}
        </div>

        {spotifyAuth.profile && (
          <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <div className="flex items-center gap-3">
              {spotifyAuth.profile.avatar && (
                <img
                  src={spotifyAuth.profile.avatar}
                  alt={spotifyAuth.profile.displayName}
                  className="h-10 w-10 rounded-full object-cover"
                />
              )}
              <div>
                <div className="text-sm font-semibold text-white">
                  {spotifyAuth.profile.displayName}
                </div>
                <div className="text-xs text-emerald-300">
                  Abo: {spotifyAuth.profile.product || 'Premium'} •{' '}
                  {spotifyDeviceReady
                    ? `SDK aktiv (${spotifyDeviceName})`
                    : 'Connect / Bridge bereit'}
                </div>
              </div>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </div>
        )}

        {/* 1-Minute Setup Guide */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-3 text-xs text-zinc-300">
          <div className="font-semibold text-white">
            Schnell-Setup (30 Sekunden im Spotify Developer Dashboard):
          </div>
          <ol className="list-decimal space-y-1.5 pl-4 text-zinc-400">
            <li>
              Öffne das{' '}
              <button
                type="button"
                onClick={() => void openExternalUrl('https://developer.spotify.com/dashboard')}
                className="inline-flex items-center gap-1 text-emerald-400 underline hover:text-emerald-300"
              >
                Spotify Developer Dashboard
                <ExternalLink className="h-3 w-3" />
              </button>{' '}
              und klicke auf <strong>Create App</strong>.
            </li>
            <li>
              Trage unter <strong>Redirect URIs</strong> exakt diese Adresse ein:
              <div className="mt-1.5 flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-zinc-900 px-2.5 py-1.5 font-mono text-[11px] text-emerald-300">
                  {redirectUri}
                </code>
                <button
                  type="button"
                  onClick={() => void handleCopyRedirect()}
                  className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-[11px] text-zinc-200 hover:bg-zinc-700"
                >
                  {copiedUri ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedUri ? 'Kopiert' : 'Kopieren'}
                </button>
              </div>
            </li>
            <li>
              Aktiviere <strong>Web API</strong> und <strong>Web Playback SDK</strong>, speichere
              und kopiere deine <strong>Client ID</strong> hier rein:
            </li>
          </ol>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300">Spotify Client ID</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={settings.spotifyClientId}
              onChange={(e) => updateSettings({ spotifyClientId: e.target.value })}
              placeholder="z. B. 4f8a1c9e2b3d4e5f6a7b8c9d0e1f2a3b"
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 font-mono text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => void handleSpotifyConnect()}
              disabled={connecting || !settings.spotifyClientId.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 transition-colors"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {spotifyAuth.profile ? 'Neu verbinden' : 'Mit Spotify Premium verbinden'}
            </button>
          </div>
        </div>

        {/* Manual Callback Fallback (Mobile / Strict Firewalls) */}
        <details className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-3 text-xs">
          <summary className="cursor-pointer font-medium text-zinc-400 hover:text-zinc-200">
            Manueller Callback-Fallback (falls Browser-Redirect blockiert wird)
          </summary>
          <form onSubmit={handleManualCallbackSubmit} className="mt-3 flex gap-2">
            <input
              value={manualCallbackUrl}
              onChange={(e) => setManualCallbackUrl(e.target.value)}
              placeholder="Komplette Redirect-URL mit ?code=... hier einfügen"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-zinc-800 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-700"
            >
              Code einlösen
            </button>
          </form>
        </details>

        {/* Playback Mode */}
        <div className="space-y-2.5">
          <label className="text-xs font-medium text-zinc-300">Spotify Wiedergabe-Modus</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {playbackModes.map((m) => {
              const selected = settings.spotifyPlaybackMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => updateSettings({ spotifyPlaybackMode: m.id })}
                  className={`rounded-2xl border p-3.5 text-left transition-all ${
                    selected
                      ? 'border-emerald-500/60 bg-emerald-500/10'
                      : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-xs font-semibold text-white">{m.title}</div>
                  <div className="mt-1 text-[11px] leading-relaxed text-zinc-400">{m.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* YouTube Optional API Key */}
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-3">
        <div className="flex items-center gap-2.5">
          <KeyRound className="h-5 w-5 text-rose-400" />
          <div>
            <h3 className="text-base font-bold text-white">YouTube Data API v3 Key (Optional)</h3>
            <p className="text-xs text-zinc-400">
              YouTube Music Suche funktioniert bereits ohne API-Key über das native Rust-Backend.
              Optional kannst du hier einen eigenen Key für noch schnellere Ergebnisse eintragen.
            </p>
          </div>
        </div>
        <input
          type="password"
          value={settings.youtubeApiKey}
          onChange={(e) => updateSettings({ youtubeApiKey: e.target.value })}
          placeholder="AIzaSy... (optional)"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 font-mono text-sm text-white placeholder-zinc-600 outline-none focus:border-rose-500"
        />
      </section>

      {/* Runtime Info */}
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-2.5">
          <Monitor className="h-4 w-4 text-zinc-400" />
          <span>
            Laufzeitumgebung:{' '}
            <strong className="text-zinc-200">
              {isTauri() ? 'OmniPlay Native Desktop / Mobile (Tauri v2 + Rust)' : 'Web / PWA Modus'}
            </strong>
          </span>
        </div>
        <span className="font-mono text-zinc-500">v1.0.0</span>
      </section>
    </div>
  );
}
