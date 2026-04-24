import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '@/services/api/auth.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

/**
 * I6 — Reset password page. Reads the one-shot token from the `?token=`
 * query param (set in the reset email URL) and lets the user choose a new
 * password that satisfies the strong-password policy (I5).
 */
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => params.get('token') ?? '', [params]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const policyError = validatePolicy(password);
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = !policyError && !mismatch && password.length > 0 && !!token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      toast.success('Mot de passe mis à jour. Vous pouvez vous connecter.');
      navigate('/login', { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? 'Impossible de réinitialiser — lien expiré ou invalide');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-sm space-y-4 p-8 bg-card border rounded-xl shadow-sm text-center">
          <h1 className="text-xl font-bold">Lien invalide</h1>
          <p className="text-sm text-muted-foreground">
            Ce lien de réinitialisation est incomplet. Demandez-en un nouveau
            depuis la page de connexion.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block text-primary hover:underline text-sm"
          >
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-8 bg-card border rounded-xl shadow-sm">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
          <p className="text-sm text-muted-foreground">
            Choisissez un mot de passe conforme à la politique de sécurité.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">Nouveau mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoFocus
            />
            {policyError && password.length > 0 && (
              <p className="text-xs text-destructive">{policyError}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirmer</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
            />
            {mismatch && (
              <p className="text-xs text-destructive">
                Les deux mots de passe ne correspondent pas.
              </p>
            )}
          </div>

          <ul className="text-xs text-muted-foreground space-y-0.5 rounded-md border p-3">
            <li>• 8 caractères minimum</li>
            <li>• une minuscule et une majuscule</li>
            <li>• un chiffre</li>
            <li>• un caractère spécial (!@#$…)</li>
          </ul>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !canSubmit}
          >
            {loading ? 'Mise à jour…' : 'Réinitialiser le mot de passe'}
          </Button>
        </form>
      </div>
    </div>
  );
}

/** Mirrors the server-side PASSWORD_POLICY_REGEX (I5). */
function validatePolicy(pwd: string): string | null {
  if (pwd.length === 0) return null;
  if (pwd.length < 8) return 'Au moins 8 caractères.';
  if (!/[a-z]/.test(pwd)) return 'Au moins une minuscule.';
  if (!/[A-Z]/.test(pwd)) return 'Au moins une majuscule.';
  if (!/\d/.test(pwd)) return 'Au moins un chiffre.';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/.test(pwd))
    return 'Au moins un caractère spécial.';
  return null;
}
