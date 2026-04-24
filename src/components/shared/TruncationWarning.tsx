import { AlertTriangle } from 'lucide-react';

interface TruncationWarningProps {
  count: number;
  label?: string;
  limit?: number;
}

/**
 * Displays a warning banner when a list has been silently truncated
 * at the API limit (default 100). Use wherever a list hook returns data
 * with `limit: 100` and no server-side pagination.
 */
export function TruncationWarning({ count, label = 'résultats', limit = 100 }: TruncationWarningProps) {
  if (count < limit) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
      <span>
        Affichage limité à <strong>{limit} {label}</strong>. Utilisez la recherche pour affiner les résultats.
      </span>
    </div>
  );
}
