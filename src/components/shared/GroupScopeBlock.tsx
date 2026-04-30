import { Building2 } from 'lucide-react';

/**
 * Inline notice rendered when an action requires a specific tenant scope but
 * the active scope is GROUP. Used by create forms (devis, facture, chantier,
 * achat, fournisseur, client) where producing data has no meaning across
 * tenants — the user must pick JS or ASP first.
 */
export function GroupScopeBlock({
  title = 'Sélectionnez une entité',
  description = "Cette action nécessite de choisir une entité spécifique. Sélectionnez 'JS Concept' ou 'ASP Signalisation' en haut à droite.",
}: { title?: string; description?: string }) {
  return (
    <div className="bg-card border rounded-lg p-6 flex items-start gap-3">
      <Building2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

/**
 * Subtle banner at the top of pages that work in GROUP scope but disable
 * write actions (Planning typically). Lets the user see consolidated data
 * without pretending they can edit it.
 */
export function GroupScopeReadOnlyBanner({
  message = 'Vue consolidée — modifications désactivées. Sélectionnez une entité pour planifier.',
}: { message?: string }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex items-center gap-2">
      <Building2 className="h-3.5 w-3.5" />
      <span>{message}</span>
    </div>
  );
}
