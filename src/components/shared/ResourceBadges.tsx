import type { UserType, UserJobFunction } from '@/types';

const typeConfig: Record<string, { label: string; className: string }> = {
  terrain: { label: 'Terrain', className: 'bg-success/15 text-success' },
  bureau: { label: 'Bureau', className: 'bg-violet-500/15 text-violet-600 dark:text-violet-400' },
};

const jobFunctionConfig: Record<string, { label: string }> = {
  technicien: { label: 'Technicien' },
  graphiste: { label: 'Graphiste' },
  conducteur_travaux: { label: 'Conducteur de travaux' },
  bureau_etude: { label: "Bureau d'étude" },
  autre: { label: 'Autre' },
};

export function TypeBadge({ type }: { type: UserType | string | null | undefined }) {
  if (!type) return null;
  const config = typeConfig[type];
  if (!config) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${config.className}`}>
      {config.label}
    </span>
  );
}

export function JobFunctionBadge({ jobFunction }: { jobFunction: UserJobFunction | string | null | undefined }) {
  if (!jobFunction) return null;
  const config = jobFunctionConfig[jobFunction];
  if (!config) return <span className="text-xs text-muted-foreground">{jobFunction}</span>;
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      {config.label}
    </span>
  );
}

export function jobFunctionLabel(jobFunction: string | null | undefined): string {
  if (!jobFunction) return '';
  return jobFunctionConfig[jobFunction]?.label ?? jobFunction;
}
