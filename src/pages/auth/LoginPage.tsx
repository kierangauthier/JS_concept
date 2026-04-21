import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';
  const [email, setEmail] = useState('marc@asp-signalisation.fr');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      const msg = err?.message && err.message !== 'Failed to fetch'
        ? err.message
        : 'Serveur inaccessible — vérifiez que l\'API est démarrée';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-8 bg-card border rounded-xl shadow-sm">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">ConceptManager</h1>
          <p className="text-sm text-muted-foreground">Connexion à votre espace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.fr"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>

        <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
          <p className="font-medium">Comptes de démo :</p>
          {[
            { email: 'marc@asp-signalisation.fr', role: 'Admin ASP' },
            { email: 'thomas@jsconcept.fr', role: 'Conducteur JS' },
            { email: 'karim@asp-signalisation.fr', role: 'Technicien ASP' },
            { email: 'sophie@jsconcept.fr', role: 'Comptable JS' },
          ].map((u) => (
            <button
              key={u.email}
              type="button"
              className="block w-full text-left hover:text-foreground transition-colors cursor-pointer"
              onClick={() => { setEmail(u.email); setPassword('password123'); }}
            >
              {u.role} — {u.email}
            </button>
          ))}
          <p className="text-muted-foreground mt-1">Mot de passe : password123</p>
        </div>
      </div>
    </div>
  );
}
