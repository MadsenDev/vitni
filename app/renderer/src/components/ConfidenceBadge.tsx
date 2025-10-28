import type { Confidence } from '@shared/types';
import { confidenceToBadgeColor, formatConfidenceLabel } from '../lib/confidence';

interface Props {
  confidence: Confidence;
}

export function ConfidenceBadge({ confidence }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${confidenceToBadgeColor(
        confidence
      )}`}
    >
      {formatConfidenceLabel(confidence)}
    </span>
  );
}
