import { useState } from 'react';
import { Plus, Radio } from 'lucide-react';
import { useMusicStore } from '@/store/useMusicStore';
import { TrackRow } from '@/components/TrackRow';

export function RadioView() {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

  const radioStations = useMusicStore((s) => s.radioStations);
  const addRadioStation = useMusicStore((s) => s.addRadioStation);
  const playTrack = useMusicStore((s) => s.playTrack);
  const showToast = useMusicStore((s) => s.showToast);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    const station = {
      id: `radio:${Date.now()}`,
      source: 'radio' as const,
      sourceId: url.trim(),
      streamUrl: url.trim(),
      title: title.trim() || 'Eigener Radio-Stream',
      artist: 'Custom Stream',
      album: 'Live Radio',
      duration: 0,
    };
    addRadioStation(station);
    setTitle('');
    setUrl('');
    showToast(`Sender „${station.title}“ hinzugefügt`);
    void playTrack(station, [station, ...radioStations]);
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="flex items-center gap-2.5 text-2xl font-bold text-white">
          <Radio className="h-6 w-6 text-cyan-400" />
          Live Radio & Direct Streams
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          24/7 Webradio-Sender oder eigene MP3/AAC/OGG-Stream-URLs abspielen.
        </p>
      </div>

      <form
        onSubmit={handleAdd}
        className="grid grid-cols-1 gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 sm:grid-cols-[1fr_2fr_auto]"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sender-Name (z. B. TechnoBase)"
          className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-cyan-500"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Stream URL (https://.../stream.mp3)"
          className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-cyan-500"
        />
        <button
          type="submit"
          disabled={!url.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Hinzufügen
        </button>
      </form>

      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-2">
        {radioStations.map((station, idx) => (
          <TrackRow
            key={station.id}
            track={station}
            index={idx}
            contextQueue={radioStations}
          />
        ))}
      </div>
    </div>
  );
}
