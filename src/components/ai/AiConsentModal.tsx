import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { http } from "@/services/api/http";
import { toast } from "sonner";
import { useApp } from "@/contexts/AppContext";

/**
 * V4.8 — Opt-in modal for AI features.
 *
 * The backend returns 403 with `{ code: 'AI_CONSENT_REQUIRED' }` on every AI
 * endpoint when the current user hasn't consented. This modal collects the
 * consent, calls PATCH /api/users/:id/ai-consent, and fires `onGranted`
 * so the caller can retry the original action.
 */
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGranted?: () => void;
}

export function AiConsentModal({ open, onOpenChange, onGranted }: Props) {
  const { currentUser } = useApp();
  const [submitting, setSubmitting] = useState(false);

  async function accept() {
    if (!currentUser) return;
    setSubmitting(true);
    try {
      await http.patch(`/users/${currentUser.id}/ai-consent`, { consent: true });
      toast.success("Fonctionnalités IA activées");
      onOpenChange(false);
      onGranted?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Impossible d'enregistrer le consentement");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Activer les fonctionnalités d'IA</DialogTitle>
          <DialogDescription>
            Avant d'utiliser l'assistant, la rédaction automatique ou les alertes proactives,
            votre consentement explicite est requis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Les contenus que vous soumettez à l'IA (questions, devis, factures, emails)
            sont traités par <strong>Anthropic PBC (États-Unis)</strong>, sous-traitant
            sélectionné pour cette fonctionnalité.
          </p>
          <p>
            Ce transfert hors Union européenne est encadré par les Clauses Contractuelles
            Types de la Commission européenne (2021/914).
          </p>
          <p>
            Vous pourrez retirer ce consentement à tout moment depuis votre espace
            utilisateur. Pour plus d'informations, consultez notre{" "}
            <a href="/confidentialite" className="underline underline-offset-4 hover:text-foreground">
              politique de confidentialité
            </a>.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Refuser
          </Button>
          <Button onClick={accept} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement…
              </>
            ) : (
              "Accepter et activer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
