import { useFilterByCompany } from '@/contexts/AppContext';
import { mockJobs, mockTimeEntries } from '@/services/mockData';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MapPin, Clock, Camera, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Terrain() {
  const jobs = useFilterByCompany(mockJobs).filter(j => j.status === 'in_progress');
  const timeEntries = useFilterByCompany(mockTimeEntries);

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-bold">Vue Terrain</h1>
        <p className="text-sm text-muted-foreground">Feuille de route du jour</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => toast.info('Pointage heures')}>
          <Clock className="h-5 w-5" />
          <span className="text-xs">Pointer mes heures</span>
        </Button>
        <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => toast.info('Ajout photo chantier')}>
          <Camera className="h-5 w-5" />
          <span className="text-xs">Photo chantier</span>
        </Button>
      </div>

      {/* Active jobs for today */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Chantiers actifs</h2>
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job.id} className="bg-card border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold font-mono">{job.reference}</span>
                <StatusBadge type="job" status={job.status} />
              </div>
              <h3 className="text-sm font-medium mb-1">{job.title}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {job.address}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${job.progress}%` }} />
                </div>
                <span className="text-xs font-medium">{job.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent time entries */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dernières heures</h2>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => toast.info('Saisie d\'heures')}>
            <Plus className="h-3 w-3" /> Ajouter
          </Button>
        </div>
        <div className="space-y-2">
          {timeEntries.slice(0, 5).map(te => (
            <div key={te.id} className="bg-card border rounded-lg px-3 py-2 flex items-center gap-3">
              <div className="text-xs font-medium text-muted-foreground w-16">{new Date(te.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium font-mono">{te.jobRef}</div>
                <div className="text-xs text-muted-foreground truncate">{te.description}</div>
              </div>
              <span className="text-sm font-bold">{te.hours}h</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
