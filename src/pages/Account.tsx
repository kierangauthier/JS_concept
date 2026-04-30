import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApp } from "@/contexts/AppContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Loader2, ShieldCheck, History } from "lucide-react";
import { gdprApi, ConsentEvent } from "@/services/api/gdpr.api";
import { toISODateLocal } from "@/lib/format";

/**
 * V5.4 — Self-service privacy page.
 *
 * The data subject (the logged-in user) can:
 *  - toggle their AI processing consent,
 *  - see the audit history of their consent events,
 *  - export all personal data the system holds about them as JSON.
 *
 * Erasure (right to be forgotten) stays admin-only — self-anonymization in a
 * multi-tenant SaaS is risky (locks your own accounting chain). Users contact
 * an admin or the DPO per the privacy policy.
 */
export default function Account() {
  const { currentUser } = useApp();
  const qc = useQueryClient();
  const [exporting, setExporting] = useState(false);

  const userId = currentUser?.id;

  // Consent history — current value is derived from the most recent row per purpose.
  const historyQuery = useQuery({
    queryKey: ["consent-history", userId],
    queryFn: () => gdprApi.getConsentHistory(userId!),
    enabled: !!userId,
  });

  const aiConsent = (() => {
    const events = historyQuery.data ?? [];
    const ai = events.find((e) => e.purpose === "ai_processing");
    return ai?.granted ?? false;
  })();

  const setAiConsent = useMutation({
    mutationFn: (consent: boolean) => gdprApi.setAiConsent(userId!, consent),
    onSuccess: (_, consent) => {
      toast.success(consent ? "IA activée" : "IA désactivée");
      qc.invalidateQueries({ queryKey: ["consent-history", userId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec de la mise à jour"),
  });

  async function handleExport() {
    if (!userId) return;
    setExporting(true);
    try {
      const blob = await gdprApi.downloadExport(userId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mes-donnees-${userId}-${toISODateLocal(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export téléchargé");
    } catch (e: any) {
      toast.error(e?.message ?? "Export impossible");
    } finally {
      setExporting(false);
    }
  }

  if (!currentUser) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Chargement du compte…</div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Mon compte"
        subtitle="Consentement, données personnelles, sécurité"
      />

      {/* Profil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            Profil
          </CardTitle>
          <CardDescription>Informations visibles dans votre session.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground uppercase">Nom</div>
            <div className="font-medium">{currentUser.name}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase">Email</div>
            <div className="font-medium">{currentUser.email}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase">Rôle</div>
            <div className="font-medium">{currentUser.role}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase">Entité</div>
            <div className="font-medium">{currentUser.company}</div>
          </div>
        </CardContent>
      </Card>

      {/* Consentement IA */}
      <Card>
        <CardHeader>
          <CardTitle>Traitement par l'IA (Anthropic)</CardTitle>
          <CardDescription>
            Autorise l'envoi de vos contenus métier (devis, factures, messages) à Anthropic PBC
            (États-Unis), sous-traitant de la fonctionnalité IA. Encadré par les Clauses
            Contractuelles Types 2021/914.{" "}
            <a href="/confidentialite" className="underline underline-offset-4">
              En savoir plus
            </a>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-medium">
              {aiConsent ? "Actif" : "Désactivé"}
            </div>
            <div className="text-xs text-muted-foreground">
              Vous pouvez révoquer ce consentement à tout moment.
            </div>
          </div>
          <Switch
            aria-label="Consentement au traitement par l'IA"
            checked={aiConsent}
            disabled={setAiConsent.isPending}
            onCheckedChange={(v) => setAiConsent.mutate(v)}
          />
        </CardContent>
      </Card>

      {/* Export des données */}
      <Card>
        <CardHeader>
          <CardTitle>Exporter mes données (RGPD Art. 20)</CardTitle>
          <CardDescription>
            Téléchargez un fichier JSON contenant toutes les données personnelles que le service
            détient sur vous : profil, heures, assignations, absences, documents RH, journaux
            d'activité.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Préparation…
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                Télécharger mes données
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Historique des consentements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" aria-hidden="true" />
            Historique des consentements
          </CardTitle>
          <CardDescription>
            Chaque activation ou révocation est horodatée et conservée pour la conformité.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Chargement…</div>
          ) : (historyQuery.data?.length ?? 0) === 0 ? (
            <div className="text-sm text-muted-foreground">
              Aucun évènement pour l'instant.
            </div>
          ) : (
            <ul className="space-y-2 text-sm">
              {historyQuery.data!.map((e: ConsentEvent) => (
                <li key={e.id} className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{labelForPurpose(e.purpose)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(e.at).toLocaleString("fr-FR")}
                      {e.ip ? ` — IP ${e.ip}` : ""}
                    </div>
                  </div>
                  <Badge variant={e.granted ? "default" : "outline"}>
                    {e.granted ? "Activé" : "Révoqué"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Suppression du compte */}
      <Card>
        <CardHeader>
          <CardTitle>Supprimer mes données (RGPD Art. 17)</CardTitle>
          <CardDescription>
            Pour exercer votre droit à l'effacement, contactez un administrateur de votre entité
            ou le DPO (voir{" "}
            <a href="/confidentialite" className="underline underline-offset-4">
              politique de confidentialité
            </a>
            ). L'anonymisation est irréversible et conserve les écritures comptables
            impérativement requises par la loi (10 ans).
          </CardDescription>
        </CardHeader>
      </Card>

      <Separator />
      <p className="text-xs text-muted-foreground">
        ID utilisateur : {currentUser.id}
      </p>
    </div>
  );
}

function labelForPurpose(p: string): string {
  switch (p) {
    case "ai_processing":
      return "Traitement IA (Anthropic)";
    case "email_marketing":
      return "Communications commerciales";
    case "location_tracking":
      return "Géolocalisation terrain";
    default:
      return p;
  }
}
