# OmniPlay — All-in-One Music Player

**OmniPlay** ist ein ultra-performanter, nativer Cross-Platform Musik-Player (gebaut mit **Tauri v2 + Rust + React + TypeScript**), der **Spotify Premium**, **YouTube / YouTube Music**, **SoundCloud**, **Lokale Audio-Dateien** (MP3/FLAC/WAV/OGG/M4A/OPUS) und **Live-Radio** in einer einzigen modernen Oberfläche im Spotify-Stil vereint.

## Features

- **Unified Search & Direct Links**: Suche gleichzeitig auf Spotify Premium, YouTube Music, SoundCloud, lokalen Dateien und Radio — oder füge direkt einen Song-Link ein.
- **Plattformübergreifende Playlists**: Mische Spotify-, YouTube-, SoundCloud- und lokale Tracks in einer einzigen Playlist mit nahtlosem Adapter-Wechsel.
- **Spotify Premium Integration (OAuth 2.0 PKCE)**:
  - **Web Playback SDK** direkt in OmniPlay (Windows & Web)
  - **Spotify Connect** Steuerung (ideal auf Arch Linux mit `spotifyd` / `librespot` oder Spotify Mobile)
  - **Automatische YouTube Audio Bridge** als DRM-freier Fallback für Plattformen ohne Widevine
  - **1-Klick Import** deiner Spotify Playlists & Lieblingssongs
- **Nativer Rust-Backend-Turbo**:
  - YouTube & SoundCloud Suche ohne CORS-Probleme und ohne API-Key
  - Blitzschneller lokaler Ordner-Scanner mit echtem ID3/FLAC/MP4-Tag-Parser (`lofty`)
  - Lokaler OAuth-Callback-Server (`127.0.0.1:17420`) für 1-Klick Spotify Login
- **Desktop & Mobile Ready**:
  - **Windows** (`.exe` NSIS Installer & `.msi`)
  - **Arch Linux** (natives `.pkg.tar.zst` Paket + `.AppImage`)
  - **Android** (`.apk`)
  - **iOS / Browser** (responsive Web-App / PWA)

---

## Downloads (GitHub Actions / Releases)

Alle Plattform-Builds werden automatisch über [`.github/workflows/build-all.yml`](.github/workflows/build-all.yml) auf GitHub gebaut:
- **Windows**: `omniplay-windows-x64` (`.exe` / `.msi`)
- **Arch Linux**: `omniplay-arch-linux-x86_64` → Installation per `sudo pacman -U omniplay-*.pkg.tar.zst`
- **Linux Universal**: `omniplay-linux-x64` (`.AppImage`, `.deb`, `.rpm`)
- **Android**: `omniplay-android-apk` (`.apk`)
- **Web / iOS PWA**: `omniplay-web-pwa`

---

## Spotify Premium Setup (30 Sekunden)

1. Öffne das [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) und erstelle eine neue App.
2. Füge unter **Redirect URIs** hinzu:
   - Desktop-App: `http://127.0.0.1:17420/callback`
   - Web-App (optional): `http://localhost:1420/callback`
3. Aktiviere **Web API** und **Web Playback SDK**.
4. Kopiere die **Client ID** in OmniPlay unter **Einstellungen → Spotify Client ID** und klicke auf **Mit Spotify Premium verbinden**.

---

## Lokale Entwicklung

```bash
npm install
npm run dev          # Web-Entwicklung (http://localhost:1420)
npm run tauri:dev    # Native Desktop-App (Windows / Arch Linux)
npm run tauri:build  # Produktions-Installer bauen
```

### Arch Linux Abhängigkeiten (für lokales Kompilieren)
```bash
sudo pacman -S --needed base-devel nodejs npm rust webkit2gtk-4.1 gtk3 libayatana-appindicator librsvg gst-plugins-good gst-libav
```
