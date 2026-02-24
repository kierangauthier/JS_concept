import { PageHeader } from '@/components/shared/PageHeader';
import { Wrench, Truck, Package, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const vehicles = [
  { id: 'v1', name: 'Camion balisage ASP-01', type: 'Camion', status: 'Disponible', nextMaintenance: '2024-09-15' },
  { id: 'v2', name: 'Fourgon ASP-02', type: 'Fourgon', status: 'En chantier', nextMaintenance: '2024-08-20' },
  { id: 'v3', name: 'Nacelle ASP-03', type: 'Nacelle', status: 'Maintenance', nextMaintenance: '2024-07-30' },
  { id: 'v4', name: 'Camion JS-01', type: 'Camion', status: 'Disponible', nextMaintenance: '2024-10-01' },
  { id: 'v5', name: 'Fourgon JS-02', type: 'Fourgon', status: 'En chantier', nextMaintenance: '2024-09-05' },
];

const statusColors: Record<string, string> = {
  'Disponible': 'bg-success/15 text-success',
  'En chantier': 'bg-info/15 text-info',
  'Maintenance': 'bg-warning/15 text-warning-foreground',
};

export default function Workshop() {
  return (
    <div className="space-y-6">
      <PageHeader title="Atelier" subtitle="Véhicules, matériel et stock" />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Véhicules', value: vehicles.length, icon: Truck },
          { label: 'Disponibles', value: vehicles.filter(v => v.status === 'Disponible').length, icon: Package },
          { label: 'En maintenance', value: vehicles.filter(v => v.status === 'Maintenance').length, icon: Wrench },
          { label: 'Alertes', value: 1, icon: AlertCircle },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</span>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Vehicle list */}
      <div className="bg-card rounded-lg border">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Parc véhicules</h2>
        </div>
        <div className="divide-y">
          {vehicles.map(v => (
            <div key={v.id} className="px-4 py-3 flex items-center gap-4 table-row-hover cursor-pointer" onClick={() => toast.info(`Fiche ${v.name}`)}>
              <Truck className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{v.name}</div>
                <div className="text-xs text-muted-foreground">{v.type}</div>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[v.status]}`}>
                {v.status}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:block">
                Maintenance: {new Date(v.nextMaintenance).toLocaleDateString('fr-FR')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
