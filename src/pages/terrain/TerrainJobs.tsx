import { useFilterByCompany } from '@/contexts/AppContext';
import { useOfflineQuery } from '@/services/offline/hooks';
import { jobsApi } from '@/services/api/jobs.api';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MapPin, ChevronRight, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export default function TerrainJobs() {
  const { data: apiJobs, isLoading } = useOfflineQuery(
    'jobs:all',
    ['jobs'],
    () => jobsApi.list({ limit: 200 }).then(r => r.data),
  );
  const jobs = useFilterByCompany(apiJobs ?? []).filter(j => ['in_progress', 'planned'].includes(j.status));

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-48 mt-1" /></div>
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold">Chantiers</h1>
        <p className="text-xs text-muted-foreground">{jobs.length} chantier{jobs.length > 1 ? 's' : ''} assigné{jobs.length > 1 ? 's' : ''}</p>
      </div>

      <div className="space-y-2">
        {jobs.map(job => (
          <Link key={job.id} to="/terrain" className="block bg-card border rounded-xl p-4 active:scale-[0.98] transition-transform">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold font-mono">{job.reference}</span>
              <div className="flex items-center gap-2">
                <StatusBadge type="job" status={job.status} />
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-sm font-medium mb-1">{job.title}</h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {job.address}
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${job.progress}%` }} />
              </div>
              <span className="text-xs font-medium">{job.progress}%</span>
            </div>
          </Link>
        ))}
      </div>

      {jobs.length === 0 && (
        <div className="text-center py-12">
          <Briefcase className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Aucun chantier actif</p>
        </div>
      )}
    </div>
  );
}
