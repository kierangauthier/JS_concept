import { useState, useEffect } from 'react';
import { Download, FileText, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { dataDumpApi, DataDumpManifest } from '@/services/api/export.api';
import { toast } from 'sonner';
import { fmt } from '@/lib/format';

const FILE_TYPES = [
  { type: 'clients', label: 'Clients' },
  { type: 'quotes', label: 'Devis' },
  { type: 'invoices', label: 'Factures' },
  { type: 'jobs', label: 'Chantiers' },
  { type: 'time-entries', label: 'Heures' },
] as const;

export default function AdminExportData() {
  const [manifest, setManifest] = useState<DataDumpManifest | null>(null);
  const [loadingManifest, setLoadingManifest] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    dataDumpApi
      .getManifest()
      .then(setManifest)
      .catch((e) => toast.error(e?.message ?? 'Impossible de charger le manifeste'))
      .finally(() => setLoadingManifest(false));
  }, []);

  async function downloadAll() {
    if (!manifest) return;
    setDownloading(true);
    try {
      dataDumpApi.saveManifest(manifest);
      for (const f of FILE_TYPES) {
        await dataDumpApi.download(f.type);
      }
      toast.success(`${FILE_TYPES.length + 1} fichiers téléchargés`);
    } catch (e: any) {
      toast.error(e?.message ?? "Échec d'un téléchargement");
    } finally {
      setDownloading(false);
    }
  }

  const totalRecords = manifest?.files.reduce((s, f) => s + f.records, 0) ?? 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Export des données"
        subtitle="Droit à la portabilité (RGPD article 20)"
      />

      <div className="bg-card border rounded-xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            Cet export contient l'ensemble des données structurées de votre entité au
            format CSV (UTF-8, séparateur point-virgule). Il est destiné à un changement
            d'outil ou à une réponse à une demande de portabilité d'un utilisateur final.
            <br />
            Chaque téléchargement est journalisé dans le journal d'audit.
          </div>
        </div>

        {loadingManifest ? (
          <div className="text-sm text-muted-foreground py-4">Préparation du manifeste…</div>
        ) : manifest ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {manifest.files.map((f) => (
                <div key={f.name} className="bg-muted/40 rounded-lg p-3 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {f.name.replace('.csv', '')}
                  </div>
                  <div className="text-lg font-bold tabular-nums">{fmt.number(f.records, 0)}</div>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              Total : <strong>{fmt.number(totalRecords, 0)}</strong> enregistrements ·
              Périmètre : <strong>{manifest.scope ?? 'GROUP'}</strong>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={downloadAll} disabled={downloading} className="gap-2 h-11">
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {downloading ? 'Téléchargement…' : 'Tout télécharger (manifeste + 5 CSV)'}
              </Button>
              {FILE_TYPES.map((f) => (
                <Button
                  key={f.type}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-11"
                  onClick={() => dataDumpApi.download(f.type)}
                  disabled={downloading}
                >
                  <FileText className="h-3.5 w-3.5" /> {f.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="bg-warning/5 border border-warning/30 rounded-xl p-5 space-y-2">
        <div className="text-sm font-semibold">Exports volumineux — sur demande</div>
        <p className="text-xs text-muted-foreground">
          Les <strong>PDF de factures</strong> (signés, intégrité scellée par hash HMAC) et les{' '}
          <strong>photos chantier</strong> (avec métadonnées EXIF préservées) ne sont pas
          téléchargeables en un clic. Pour préparer ces archives :
        </p>
        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
          <li>Ouvrir un ticket auprès du DPO : <a className="underline" href="mailto:dpo@acreediasolutions.com">dpo@acreediasolutions.com</a></li>
          <li>Délai indicatif : <strong>72 h ouvrées</strong></li>
          <li>Format de remise : archive ZIP signée transmise via lien sécurisé MinIO (expirant 7 jours)</li>
        </ul>
      </div>
    </div>
  );
}
