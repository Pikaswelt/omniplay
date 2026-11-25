use lofty::file::{AudioFile, TaggedFileExt};
use lofty::probe::Probe;
use lofty::tag::Accessor;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::path::Path;
use std::sync::OnceLock;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::sync::RwLock;
use url::Url;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackDto {
    pub id: String,
    pub source: String,
    pub source_id: String,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub duration: u64,
    pub artwork: Option<String>,
    pub url: Option<String>,
    pub stream_url: Option<String>,
    pub spotify_uri: Option<String>,
}

fn http_client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
            .timeout(Duration::from_secs(12))
            .build()
            .expect("failed to build reqwest client")
    })
}

fn sc_client_id_cache() -> &'static RwLock<Option<String>> {
    static CACHE: OnceLock<RwLock<Option<String>>> = OnceLock::new();
    CACHE.get_or_init(|| RwLock::new(None))
}

fn parse_duration_text(text: &str) -> u64 {
    let parts: Vec<u64> = text
        .trim()
        .split(':')
        .filter_map(|p| p.parse::<u64>().ok())
        .collect();
    match parts.as_slice() {
        [m, s] => m * 60 + s,
        [h, m, s] => h * 3600 + m * 60 + s,
        _ => 0,
    }
}

fn collect_youtube_videos(value: &Value, out: &mut Vec<TrackDto>, limit: usize) {
    if out.len() >= limit {
        return;
    }
    match value {
        Value::Object(map) => {
            if let Some(vr) = map.get("videoRenderer").and_then(|v| v.as_object()) {
                if let Some(vid) = vr.get("videoId").and_then(|v| v.as_str()) {
                    let title = vr
                        .get("title")
                        .and_then(|t| t.get("runs"))
                        .and_then(|r| r.as_array())
                        .and_then(|arr| arr.first())
                        .and_then(|r| r.get("text"))
                        .and_then(|t| t.as_str())
                        .unwrap_or("YouTube Track")
                        .to_string();

                    let artist = vr
                        .get("ownerText")
                        .or_else(|| vr.get("longBylineText"))
                        .and_then(|t| t.get("runs"))
                        .and_then(|r| r.as_array())
                        .and_then(|arr| arr.first())
                        .and_then(|r| r.get("text"))
                        .and_then(|t| t.as_str())
                        .unwrap_or("YouTube")
                        .to_string();

                    let duration = vr
                        .get("lengthText")
                        .and_then(|l| l.get("simpleText"))
                        .and_then(|s| s.as_str())
                        .map(parse_duration_text)
                        .unwrap_or(0);

                    if !out.iter().any(|t| t.source_id == vid) {
                        out.push(TrackDto {
                            id: format!("youtube:{vid}"),
                            source: "youtube".to_string(),
                            source_id: vid.to_string(),
                            title,
                            artist,
                            album: Some("YouTube Music".to_string()),
                            duration,
                            artwork: Some(format!("https://i.ytimg.com/vi/{vid}/hqdefault.jpg")),
                            url: Some(format!("https://music.youtube.com/watch?v={vid}")),
                            stream_url: None,
                            spotify_uri: None,
                        });
                    }
                }
            }
            for v in map.values() {
                collect_youtube_videos(v, out, limit);
            }
        }
        Value::Array(arr) => {
            for item in arr {
                collect_youtube_videos(item, out, limit);
            }
        }
        _ => {}
    }
}

#[tauri::command]
async fn search_youtube(query: String, music_only: bool) -> Result<Vec<TrackDto>, String> {
    let search_q = if music_only && !query.to_lowercase().contains("audio") {
        format!("{query} topic OR official audio")
    } else {
        query
    };

    let body = json!({
        "context": {
            "client": {
                "clientName": "WEB",
                "clientVersion": "2.20250115.00.00",
                "hl": "de",
                "gl": "DE"
            }
        },
        "query": search_q
    });

    let res = http_client()
        .post("https://www.youtube.com/youtubei/v1/search?prettyPrint=false")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("YouTube Suche fehlgeschlagen: {e}"))?;

    let json_data: Value = res
        .json()
        .await
        .map_err(|e| format!("YouTube Antwort ungültig: {e}"))?;

    let mut tracks = Vec::new();
    collect_youtube_videos(&json_data, &mut tracks, 16);
    Ok(tracks)
}

async fn resolve_soundcloud_client_id() -> Result<String, String> {
    {
        let cached = sc_client_id_cache().read().await;
        if let Some(id) = cached.clone() {
            return Ok(id);
        }
    }

    let html = http_client()
        .get("https://soundcloud.com")
        .send()
        .await
        .map_err(|e| format!("SoundCloud nicht erreichbar: {e}"))?
        .text()
        .await
        .map_err(|e| e.to_string())?;

    // Extract bundle script URLs (https://a-v2.sndcdn.com/assets/...js)
    let mut script_urls = Vec::new();
    let mut rest = html.as_str();
    while let Some(idx) = rest.find("https://a-v2.sndcdn.com/assets/") {
        let slice = &rest[idx..];
        if let Some(end) = slice.find('"') {
            let candidate = &slice[..end];
            if candidate.ends_with(".js") {
                script_urls.push(candidate.to_string());
            }
            rest = &slice[end..];
        } else {
            break;
        }
    }

    for js_url in script_urls.into_iter().rev().take(6) {
        if let Ok(resp) = http_client().get(&js_url).send().await {
            if let Ok(body) = resp.text().await {
                if let Some(pos) = body.find("client_id:\"") {
                    let after = &body[pos + 11..];
                    if let Some(end) = after.find('"') {
                        let cid = after[..end].to_string();
                        if cid.len() >= 16 && cid.len() <= 64 {
                            let mut guard = sc_client_id_cache().write().await;
                            *guard = Some(cid.clone());
                            return Ok(cid);
                        }
                    }
                }
            }
        }
    }

    Err("SoundCloud Client-ID konnte nicht ermittelt werden.".to_string())
}

#[tauri::command]
async fn search_soundcloud(query: String) -> Result<Vec<TrackDto>, String> {
    let client_id = resolve_soundcloud_client_id().await?;
    let url = Url::parse_with_params(
        "https://api-v2.soundcloud.com/search/tracks",
        &[
            ("q", query.as_str()),
            ("client_id", client_id.as_str()),
            ("limit", "15"),
        ],
    )
    .map_err(|e| e.to_string())?;

    let resp = http_client()
        .get(url)
        .send()
        .await
        .map_err(|e| format!("SoundCloud Suche fehlgeschlagen: {e}"))?;

    if !resp.status().is_success() {
        // Clear cached client_id in case it rotated
        let mut guard = sc_client_id_cache().write().await;
        *guard = None;
        return Ok(Vec::new());
    }

    let data: Value = resp.json().await.map_err(|e| e.to_string())?;
    let mut tracks = Vec::new();

    if let Some(collection) = data.get("collection").and_then(|c| c.as_array()) {
        for item in collection {
            let permalink = match item.get("permalink_url").and_then(|v| v.as_str()) {
                Some(u) => u,
                None => continue,
            };
            let sc_id = item
                .get("id")
                .and_then(|v| v.as_u64())
                .map(|n| n.to_string())
                .unwrap_or_else(|| permalink.to_string());
            let title = item
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("SoundCloud Track")
                .to_string();
            let artist = item
                .get("user")
                .and_then(|u| u.get("username"))
                .and_then(|v| v.as_str())
                .unwrap_or("SoundCloud")
                .to_string();
            let duration = item
                .get("duration")
                .and_then(|v| v.as_u64())
                .unwrap_or(0)
                / 1000;
            let artwork = item
                .get("artwork_url")
                .and_then(|v| v.as_str())
                .or_else(|| {
                    item.get("user")
                        .and_then(|u| u.get("avatar_url"))
                        .and_then(|v| v.as_str())
                })
                .map(|u| u.replace("-large", "-t500x500"));

            tracks.push(TrackDto {
                id: format!("soundcloud:{sc_id}"),
                source: "soundcloud".to_string(),
                source_id: permalink.to_string(),
                title,
                artist,
                album: Some("SoundCloud".to_string()),
                duration,
                artwork,
                url: Some(permalink.to_string()),
                stream_url: None,
                spotify_uri: None,
            });
        }
    }

    Ok(tracks)
}

#[tauri::command]
async fn resolve_track_url(url: String) -> Result<Option<TrackDto>, String> {
    let trimmed = url.trim().to_string();
    if trimmed.contains("soundcloud.com") {
        let oembed_url = Url::parse_with_params(
            "https://soundcloud.com/oembed",
            &[("format", "json"), ("url", trimmed.as_str())],
        )
        .map_err(|e| e.to_string())?;
        if let Ok(resp) = http_client().get(oembed_url).send().await {
            if let Ok(data) = resp.json::<Value>().await {
                let title = data
                    .get("title")
                    .and_then(|v| v.as_str())
                    .unwrap_or("SoundCloud Track")
                    .to_string();
                let artist = data
                    .get("author_name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("SoundCloud")
                    .to_string();
                let artwork = data
                    .get("thumbnail_url")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());

                return Ok(Some(TrackDto {
                    id: format!("soundcloud:{}", trimmed.len()),
                    source: "soundcloud".to_string(),
                    source_id: trimmed.clone(),
                    title,
                    artist,
                    album: Some("SoundCloud".to_string()),
                    duration: 0,
                    artwork,
                    url: Some(trimmed),
                    stream_url: None,
                    spotify_uri: None,
                }));
            }
        }
    }
    Ok(None)
}

fn is_supported_audio(path: &Path) -> bool {
    let ext = match path.extension().and_then(|e| e.to_str()) {
        Some(e) => e.to_ascii_lowercase(),
        None => return false,
    };
    matches!(
        ext.as_str(),
        "mp3" | "flac" | "wav" | "ogg" | "m4a" | "aac" | "opus"
    )
}

#[tauri::command]
fn scan_local_folder(path: String) -> Result<Vec<TrackDto>, String> {
    let root = Path::new(&path);
    if !root.exists() {
        return Err("Ordner existiert nicht.".to_string());
    }

    let mut tracks = Vec::new();
    for entry in WalkDir::new(root)
        .follow_links(false)
        .max_depth(8)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let file_path = entry.path();
        if !file_path.is_file() || !is_supported_audio(file_path) {
            continue;
        }

        let file_str = file_path.to_string_lossy().to_string();
        let fallback_title = file_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Unbekannter Titel")
            .to_string();

        let mut title = fallback_title;
        let mut artist = "Lokale Datei".to_string();
        let mut album: Option<String> = None;
        let mut duration: u64 = 0;

        if let Ok(tagged) = Probe::open(file_path).and_then(|p| p.read()) {
            duration = tagged.properties().duration().as_secs();
            if let Some(tag) = tagged.primary_tag().or_else(|| tagged.first_tag()) {
                if let Some(t) = tag.title() {
                    if !t.trim().is_empty() {
                        title = t.to_string();
                    }
                }
                if let Some(a) = tag.artist() {
                    if !a.trim().is_empty() {
                        artist = a.to_string();
                    }
                }
                if let Some(al) = tag.album() {
                    if !al.trim().is_empty() {
                        album = Some(al.to_string());
                    }
                }
            }
        }

        tracks.push(TrackDto {
            id: format!("local:{file_str}"),
            source: "local".to_string(),
            source_id: file_str.clone(),
            title,
            artist,
            album,
            duration,
            artwork: None,
            url: None,
            stream_url: Some(file_str),
            spotify_uri: None,
        });
    }

    Ok(tracks)
}

#[tauri::command]
async fn await_spotify_oauth_callback(port: u16) -> Result<String, String> {
    let listener = TcpListener::bind(("127.0.0.1", port))
        .await
        .map_err(|e| format!("Konnte OAuth-Port {port} nicht öffnen: {e}"))?;

    let accept_result = tokio::time::timeout(Duration::from_secs(180), listener.accept())
        .await
        .map_err(|_| "Spotify Login Timeout (3 Minuten abgelaufen).".to_string())?
        .map_err(|e| format!("OAuth-Verbindungsfehler: {e}"))?;

    let (mut stream, _) = accept_result;
    let mut buf = [0u8; 4096];
    let n = stream
        .read(&mut buf)
        .await
        .map_err(|e| format!("Konnte OAuth-Anfrage nicht lesen: {e}"))?;

    let request = String::from_utf8_lossy(&buf[..n]);
    let first_line = request.lines().next().unwrap_or("");
    let path = first_line.split_whitespace().nth(1).unwrap_or("/");

    let full_url = Url::parse(&format!("http://127.0.0.1:{port}{path}"))
        .map_err(|e| format!("Ungültige Callback-URL: {e}"))?;

    let mut code: Option<String> = None;
    let mut error: Option<String> = None;

    for (k, v) in full_url.query_pairs() {
        if k == "code" {
            code = Some(v.to_string());
        } else if k == "error" {
            error = Some(v.to_string());
        }
    }

    let html = if code.is_some() {
        "<!doctype html><html><body style='background:#09090b;color:#f4f4f5;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0'><div style='text-align:center;padding:32px;border:1px solid #27272a;border-radius:20px;background:#18181b'><h2 style='color:#10b981;margin-top:0'>OmniPlay verbunden!</h2><p style='color:#a1a1aa'>Dein Spotify-Premium-Account ist jetzt aktiv. Du kannst diesen Tab schließen.</p></div></body></html>"
    } else {
        "<!doctype html><html><body style='background:#09090b;color:#f4f4f5;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0'><div style='text-align:center;padding:32px;border:1px solid #27272a;border-radius:20px;background:#18181b'><h2 style='color:#f43f5e;margin-top:0'>Login abgebrochen</h2><p style='color:#a1a1aa'>Bitte versuche es erneut in OmniPlay.</p></div></body></html>"
    };

    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        html.len(),
        html
    );
    let _ = stream.write_all(response.as_bytes()).await;
    let _ = stream.flush().await;

    if let Some(err) = error {
        return Err(format!("Spotify Auth Fehler: {err}"));
    }

    code.ok_or_else(|| "Kein Spotify Auth-Code erhalten.".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            search_youtube,
            search_soundcloud,
            resolve_track_url,
            scan_local_folder,
            await_spotify_oauth_callback
        ])
        .run(tauri::generate_context!())
        .expect("error while running OmniPlay");
}
