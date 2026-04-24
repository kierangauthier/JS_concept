import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '@/services/api/auth.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

/**
 * I6 — Forgot password page.
 *
 * UX intent: always show the same success state whether or not the address
 * matches an account, to mirror the server's anti-enumeration behavior.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erreur — réessayez dans quelques instants');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-8 bg-card border rounded-xl shadow-sm">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
          <p className="text-sm text-muted-foreground">
            Entrez votre adresse e-mail et nous vous enverrons un lien pour
            réinitialiser votre mot de passe.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4 text-sm">
            <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
              Si un compte existe pour <strong>{email}</strong>, un e-mail vient
              d'être envoyé avec un lien de réinitialisation (valide 60&nbsp;minutes).
            </p>
            <p className="text-muted-foreground">
              Vérifiez votre boîte de réception, ainsi que le dossier courrier
              indésirable.
            </p>
            <Link
              to="/login"
              className="inline-block text-primary hover:underline"
            >
              ← Retour à la connexion
            </Link>
          </div>
        ) : (
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
            </Button>

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Retour à la connexion
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
