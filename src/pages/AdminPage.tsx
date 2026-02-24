import { PageHeader } from '@/components/shared/PageHeader';
import { useApp } from '@/contexts/AppContext';
import { mockUsers, mockClients, mockSuppliers } from '@/services/mockData';
import { Users, Building2, Truck, Shield } from 'lucide-react';

const roleLabels: Record<string, string> = {
  admin: 'Admin / Gérant',
  conducteur: 'Conducteur de travaux',
  technicien: 'Technicien terrain',
  comptable: 'Comptable',
};

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Administration" subtitle="Paramètres et gestion" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Utilisateurs', value: mockUsers.length, icon: Users },
          { label: 'Clients', value: mockClients.length, icon: Building2 },
          { label: 'Fournisseurs', value: mockSuppliers.length, icon: Truck },
          { label: 'Rôles', value: 4, icon: Shield },
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

      {/* Users list */}
      <div className="bg-card rounded-lg border">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Utilisateurs</h2>
        </div>
        <div className="divide-y">
          {mockUsers.map(u => (
            <div key={u.id} className="px-4 py-3 flex items-center gap-4 table-row-hover">
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-xs font-bold text-secondary-foreground">
                  {u.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{u.name}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </div>
              <span className="text-xs font-medium text-muted-foreground">{roleLabels[u.role]}</span>
              <span className="text-xs font-bold uppercase px-1.5 py-0.5 rounded bg-muted">{u.company}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Suppliers list */}
      <div className="bg-card rounded-lg border">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Fournisseurs</h2>
        </div>
        <div className="divide-y">
          {mockSuppliers.map(s => (
            <div key={s.id} className="px-4 py-3 flex items-center gap-4 table-row-hover">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.contact} · {s.email}</div>
              </div>
              <span className="text-xs text-muted-foreground">{s.category}</span>
              <span className="text-xs font-bold uppercase px-1.5 py-0.5 rounded bg-muted">{s.company}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
