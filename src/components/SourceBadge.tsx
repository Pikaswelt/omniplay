import type { SourceType } from '@/types/music';
import { SOURCE_META } from '@/utils/format';

interface SourceBadgeProps {
  source: SourceType;
  compact?: boolean;
}

export function SourceBadge({ source, compact = false }: SourceBadgeProps) {
  const meta = SOURCE_META[source];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium tracking-wide select-none ${
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
      } ${meta.badgeClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
      {compact ? meta.shortLabel : meta.label}
    </span>
  );
}
