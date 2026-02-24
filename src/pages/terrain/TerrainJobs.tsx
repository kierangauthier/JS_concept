import { useFilterByCompany } from '@/contexts/AppContext';
import { mockJobs } from '@/services/mockData';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MapPin, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TerrainJobs() {
  const jobs = useFilterByCompany(mockJobs).filter(j => ['in_progress', 'planned'].includes(j.status));

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold">Chantiers</h1>
        <p className="text-xs text-muted-foreground">{jobs.length} chantiers assignés</p>
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
    </div>
  );
}
