import { useState, useRef } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { AdminSubnav } from '@/components/shared/AdminSubnav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useImportPreview, useImportExecute } from '@/services/api/hooks';
import { importApi, ImportType, PreviewResult, DuplicateAction, SoftMatch } from '@/services/api/import.api';
import { Upload, Download, CheckCircle2, AlertTriangle, XCircle, ArrowLeft, ArrowRight, Loader2, FileSpreadsheet, Merge, SkipForward, Plus } from 'lucide-react';

type Step = 'upload' | 'preview' | 'result';

const typeLabels: Record<ImportType, string> = {
  clients: 'Clients',
  suppliers: 'Fournisseurs',
  jobs: 'Chantiers',
  invoices: 'Factures (soldes)',
};

const typeOrder: ImportType[] = ['clients', 'suppliers', 'jobs', 'invoices'];

export default function ImportData() {
  const [step, setStep] = useState<Step>('upload');
  const [importType, setImportType] = useState<ImportType>('clients');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [duplicateActions, setDuplicateActions] = useState<Map<number, DuplicateAction>>(new Map());
  const [result, setResult] = useState<{ imported: number; merged: number; skipped: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewMutation = useImportPreview();
  const executeMutation = useImportExecute();

  // ─── Step 1: Upload ─────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    const data = await previewMutation.mutateAsync({ file, type: importType });
    setPreviewData(data);
    // Initialize duplicate actions
    const actions = new Map<number, DuplicateAction>();
    data.duplicates.forEach((d) => {
      actions.set(d.line, {
        line: d.line,
        action: d.suggestedAction,
        mergePolicy: 'safe',
      });
    });
    setDuplicateActions(actions);
    setStep('preview');
  };

  const handleDownloadTemplate = () => {
    importApi.downloadTemplate(importType);
  };

  // ─── Step 2: Preview ────────────────────────────

  const updateDuplicateAction = (line: number, action: 'merge' | 'skip' | 'create', mergePolicy?: 'safe' | 'overwrite') => {
    setDuplicateActions((prev) => {
      const next = new Map(prev);
      next.set(line, { line, action, mergePolicy: mergePolicy || 'safe' });
      return next;
    });
  };

  const handleExecute = async () => {
    if (!previewData) return;
    const res = await executeMutation.mutateAsync({
      type: importType,
      fileKey: previewData.fileKey,
      checksum: previewData.checksum,
      duplicateActions: Array.from(duplicateActions.values()),
    });
    setResult(res);
    setStep('result');
  };

  // ─── Step 3: Result ─────────────────────────────

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setPreviewData(null);
    setDuplicateActions(new Map());
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Render ─────────────────────────────────────

  return (
    <div className="space-y-6">
      <AdminSubnav />
      <PageHeader
        title="Importer des données"
        subtitle="Migrer vos données existantes depuis Excel/CSV"
      />

      {/* Stepper */}
      <div className="flex items-center gap-2 text-sm">
        {(['upload', 'preview', 'result'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="w-8 h-px bg-border" />}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : step === 'result' && s !== 'result'
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              <span>{i + 1}</span>
              <span>{s === 'upload' ? 'Fichier' : s === 'preview' ? 'Aperçu' : 'Résultat'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sélectionner le type et le fichier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type de données</label>
              <div className="flex gap-2 flex-wrap">
                {typeOrder.map((t) => (
                  <Button
                    key={t}
                    variant={importType === t ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setImportType(t)}
                  >
                    {typeLabels[t]}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="mr-1 h-3 w-3" />
                Télécharger le template CSV
              </Button>
            </div>

            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-muted-foreground text-sm">
                    ({(file.size / 1024).toFixed(1)} Ko)
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Glisser un fichier .csv ici ou cliquer pour parcourir
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm text-blue-700 dark:text-blue-300">
              <strong>Ordre recommandé :</strong> Clients → Fournisseurs → Chantiers → Factures
              <br />
              Les chantiers référencent les clients, et les factures référencent les deux.
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleAnalyze}
                disabled={!file || previewMutation.isPending}
              >
                {previewMutation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Analyser
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && previewData && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{previewData.valid.length}</div>
                  <div className="text-xs text-muted-foreground">Lignes valides</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <div>
                  <div className="text-2xl font-bold">{previewData.duplicates.length}</div>
                  <div className="text-xs text-muted-foreground">Doublons potentiels</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <div className="text-2xl font-bold">{previewData.errors.length}</div>
                  <div className="text-xs text-muted-foreground">Erreurs</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Duplicates */}
          {previewData.duplicates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Doublons potentiels — décision requise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {previewData.duplicates.map((dup) => (
                  <DuplicateRow
                    key={dup.line}
                    dup={dup}
                    action={duplicateActions.get(dup.line)}
                    onAction={(action, policy) => updateDuplicateAction(dup.line, action, policy)}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Errors */}
          {previewData.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-destructive">Erreurs (non importables)</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {previewData.errors.map((err, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <span>
                        <strong>Ligne {err.line} :</strong> {err.message}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('upload')}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Retour
            </Button>
            <Button
              onClick={handleExecute}
              disabled={executeMutation.isPending || (previewData.valid.length === 0 && previewData.duplicates.length === 0)}
            >
              {executeMutation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Importer {previewData.valid.length + previewData.duplicates.filter((d) => duplicateActions.get(d.line)?.action !== 'skip').length} lignes
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 'result' && result && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="text-center space-y-2">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <h2 className="text-xl font-bold">Import terminé</h2>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{result.imported}</div>
                <div className="text-xs text-muted-foreground">Importés</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{result.merged}</div>
                <div className="text-xs text-muted-foreground">Fusionnés</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-muted-foreground">{result.skipped}</div>
                <div className="text-xs text-muted-foreground">Ignorés</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-1">
                  Avertissements :
                </p>
                <ul className="text-xs text-yellow-600 dark:text-yellow-400 space-y-0.5">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={handleReset}>
                Importer autre chose
              </Button>
              <Button onClick={() => window.location.href = `/${importType === 'invoices' ? 'invoicing' : importType === 'suppliers' ? 'purchases' : importType}`}>
                Voir les {typeLabels[importType].toLowerCase()}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Duplicate Row Component ───────────────────────────

function DuplicateRow({
  dup,
  action,
  onAction,
}: {
  dup: SoftMatch;
  action?: DuplicateAction;
  onAction: (action: 'merge' | 'skip' | 'create', policy?: 'safe' | 'overwrite') => void;
}) {
  const csvName = dup.csvRow.nom || dup.csvRow.reference || '—';
  const currentAction = action?.action || dup.suggestedAction;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Ligne {dup.line} :</span>
          <span className="font-medium truncate">"{csvName}"</span>
          <span className="text-muted-foreground">~</span>
          <span className="font-medium truncate">"{dup.matchedEntity.name}"</span>
          <Badge variant={dup.score >= 75 ? 'default' : 'secondary'} className="text-xs shrink-0">
            {dup.score}%
          </Badge>
        </div>
        {dup.matchedEntity.city && (
          <div className="text-xs text-muted-foreground mt-0.5">
            {dup.matchedEntity.city}
            {dup.matchedEntity.email ? ` · ${dup.matchedEntity.email}` : ''}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant={currentAction === 'merge' && action?.mergePolicy !== 'overwrite' ? 'default' : 'outline'}
          size="sm"
          className="text-xs h-7"
          onClick={() => onAction('merge', 'safe')}
        >
          <Merge className="mr-1 h-3 w-3" />
          Fusionner (safe)
        </Button>
        <Button
          variant={currentAction === 'merge' && action?.mergePolicy === 'overwrite' ? 'default' : 'outline'}
          size="sm"
          className="text-xs h-7"
          onClick={() => onAction('merge', 'overwrite')}
        >
          <Merge className="mr-1 h-3 w-3" />
          Écraser
        </Button>
        <Button
          variant={currentAction === 'skip' ? 'default' : 'outline'}
          size="sm"
          className="text-xs h-7"
          onClick={() => onAction('skip')}
        >
          <SkipForward className="mr-1 h-3 w-3" />
          Ignorer
        </Button>
        <Button
          variant={currentAction === 'create' ? 'default' : 'outline'}
          size="sm"
          className="text-xs h-7"
          onClick={() => onAction('create')}
        >
          <Plus className="mr-1 h-3 w-3" />
          Nouveau
        </Button>
      </div>
    </div>
  );
}
