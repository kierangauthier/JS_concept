import { useApp } from '@/contexts/AppContext';
import { mockUsers } from '@/services/mockData';
import { User, Phone, Mail, Building2, Shield, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const roleLabels: Record<string, string> = {
  admin: 'Admin / Gérant',
  conducteur: 'Conducteur de travaux',
  technicien: 'Technicien terrain',
  comptable: 'Comptable',
};

export default function TerrainProfile() {
  const { currentUser, setCurrentUser } = useApp();

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-bold">Mon profil</h1>

      {/* Profile card */}
      <div className="bg-card border rounded-xl p-5 flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
          <span className="text-lg font-bold text-secondary-foreground">
            {currentUser.name.split(' ').map(n => n[0]).join('')}
          </span>
        </div>
        <div>
          <div className="text-lg font-bold">{currentUser.name}</div>
          <div className="text-sm text-muted-foreground">{roleLabels[currentUser.role]}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Building2 className="h-3 w-3" />
            <span>{currentUser.company === 'ASP' ? 'ASP Signalisation' : 'JS Concept'}</span>
          </div>
        </div>
      </div>

      {/* Contact info */}
      <div className="bg-card border rounded-xl divide-y">
        <div className="flex items-center gap-3 px-4 py-3">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm">{currentUser.email}</div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm">06 12 34 56 78</div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm">Rôle : {roleLabels[currentUser.role]}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card border rounded-xl p-3 text-center">
          <div className="text-2xl font-bold">156</div>
          <div className="text-[10px] text-muted-foreground uppercase font-medium">Heures/mois</div>
        </div>
        <div className="bg-card border rounded-xl p-3 text-center">
          <div className="text-2xl font-bold">42</div>
          <div className="text-[10px] text-muted-foreground uppercase font-medium">Photos</div>
        </div>
        <div className="bg-card border rounded-xl p-3 text-center">
          <div className="text-2xl font-bold">8</div>
          <div className="text-[10px] text-muted-foreground uppercase font-medium">Chantiers</div>
        </div>
      </div>

      {/* Switch profile (demo) */}
      <div className="bg-card border rounded-xl p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Changer de profil (démo)</div>
        <div className="space-y-1.5">
          {mockUsers.map(u => (
            <button
              key={u.id}
              onClick={() => setCurrentUser(u)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors active:scale-[0.98] ${
                currentUser.id === u.id ? 'bg-primary/10 ring-1 ring-primary/20' : 'hover:bg-muted/50'
              }`}
            >
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-xs font-bold text-secondary-foreground">
                  {u.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{u.name}</div>
                <div className="text-[10px] text-muted-foreground">{roleLabels[u.role]} · {u.company}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Button variant="outline" className="w-full gap-1.5 text-destructive" onClick={() => toast.info('Déconnexion (placeholder)')}>
        <LogOut className="h-4 w-4" /> Déconnexion
      </Button>
    </div>
  );
}
