import { useApp } from '@/contexts/AppContext';
import { User, Phone, Mail, Building2, Shield, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

const roleLabels: Record<string, string> = {
  admin: 'Admin / Gérant',
  conducteur: 'Conducteur de travaux',
  technicien: 'Technicien terrain',
  comptable: 'Comptable',
};

export default function TerrainProfile() {
  const { currentUser, logout } = useApp();

  if (!currentUser) return null;

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
            <span>{currentUser.company === 'ASP' ? 'ASP Signalisation' : currentUser.company === 'JS' ? 'JS Concept' : 'Groupe'}</span>
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
          <Shield className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm">Rôle : {roleLabels[currentUser.role]}</div>
        </div>
      </div>

      <Button variant="outline" className="w-full gap-1.5 text-destructive" onClick={() => logout()}>
        <LogOut className="h-4 w-4" /> Déconnexion
      </Button>
    </div>
  );
}
