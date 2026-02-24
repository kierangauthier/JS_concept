import { useFilterByCompany } from '@/contexts/AppContext';
import { mockJobs } from '@/services/mockData';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge, CompanyBadge } from '@/components/shared/StatusBadge';
import { CalendarDays } from 'lucide-react';

export default function Planning() {
  const jobs = useFilterByCompany(mockJobs);
  const months = ['Janv.', 'Fév.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

  // Group by month of startDate
  const byMonth = jobs.reduce<Record<string, typeof jobs>>((acc, j) => {
    const m = months[new Date(j.startDate).getMonth()];
    (acc[m] = acc[m] || []).push(j);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader title="Planning" subtitle="Vue chronologique des chantiers" />

      <div className="space-y-4">
        {Object.entries(byMonth).map(([month, monthJobs]) => (
          <div key={month}>
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{month} 2024</h3>
              <span className="text-xs text-muted-foreground">({monthJobs.length})</span>
            </div>
            <div className="grid gap-2">
              {monthJobs.map(job => (
                <div key={job.id} className="bg-card border rounded-lg px-4 py-3 flex items-center gap-4 table-row-hover">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium font-mono">{job.reference}</span>
                      <CompanyBadge company={job.company} />
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{job.title}</div>
                  </div>
                  <span className="text-xs text-muted-foreground hidden sm:block">{job.assignedTo.join(', ')}</span>
                  <StatusBadge type="job" status={job.status} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
