import type { Confidence } from '@shared/types';

export function confidenceToBadgeColor(confidence: Confidence): string {
  switch (confidence) {
    case 'verified':
      return 'bg-verified/20 text-verified border border-verified/50';
    case 'unverified':
      return 'bg-unverified/20 text-unverified border border-unverified/50';
    default:
      return 'bg-asserted/20 text-asserted border border-asserted/50';
  }
}

export function formatConfidenceLabel(confidence: Confidence): string {
  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}
