import type { SourceType } from '@/types/music';

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const SOURCE_META: Record<
  SourceType,
  {
    label: string;
    shortLabel: string;
    badgeClass: string;
    dotClass: string;
    glowColor: string;
  }
> = {
  spotify: {
    label: 'Spotify',
    shortLabel: 'SP',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    dotClass: 'bg-emerald-400',
    glowColor: 'rgba(16, 185, 129, 0.28)',
  },
  youtube: {
    label: 'YouTube Music',
    shortLabel: 'YT',
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    dotClass: 'bg-rose-500',
    glowColor: 'rgba(244, 63, 94, 0.28)',
  },
  soundcloud: {
    label: 'SoundCloud',
    shortLabel: 'SC',
    badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    dotClass: 'bg-orange-400',
    glowColor: 'rgba(249, 115, 22, 0.28)',
  },
  local: {
    label: 'Lokal',
    shortLabel: 'LOC',
    badgeClass: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    dotClass: 'bg-violet-400',
    glowColor: 'rgba(139, 92, 246, 0.28)',
  },
  radio: {
    label: 'Radio',
    shortLabel: 'LIVE',
    badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    dotClass: 'bg-cyan-400',
    glowColor: 'rgba(6, 182, 212, 0.28)',
  },
};
