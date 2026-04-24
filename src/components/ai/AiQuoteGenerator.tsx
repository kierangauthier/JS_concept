/**
 * AiQuoteGenerator — Modal qui permet de décrire un chantier en texte
 * et obtient des lignes de devis pré-remplies depuis l'IA.
 *
 * Usage :
 *   <AiQuoteGenerator onLinesGenerated={(subject, lines) => { ... }} />
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, AlertCircle, CheckCircle2, Mic } from 'lucide-react';
import { useExtractQuoteLines } from '@/services/api/hooks';
import { QuoteLineAI } from '@/services/api/ai.api';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinesGenerated: (subject: string, lines: QuoteLineAI[]) => void;
}

const confidenceConfig = {
  high:   { label: 'Confiance élevée', className: 'bg-green-100 text-green-700' },
  medium: { label: 'Confiance moyenne', className: 'bg-yellow-100 text-yellow-700' },
  low:    { label: 'Confiance faible — vérifiez les montants', className: 'bg-red-100 text-red-700' },
};

const PLACEHOLDER = `Exemple :
"Pose de 12 panneaux de signalisation route B1 sur poteau galvanisé rue de la République.
Fourniture des panneaux A14 et C50. Marquage au sol 40 mètres ligne continue.
Intervention prévue semaine prochaine, équipe de 2 techniciens."`;

export function AiQuoteGenerator({ open, onOpenChange, onLinesGenerated }: Props) {
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<{ subject: string; lines: QuoteLineAI[]; confidence: string } | null>(null);
  const extractMutation = useExtractQuoteLines();

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setResult(null);
    try {
      const data = await extractMutation.mutateAsync(description.trim());
      setResult(data);
    } catch {
      // Erreur gérée par le hook
    }
  };

  const handleApply = () => {
    if (!result) return;
    onLinesGenerated(result.subject, result.lines);
    onOpenChange(false);
    setDescription('');
    setResult(null);
    toast.success(`${result.lines.length} ligne(s) importée(s) depuis l'IA`);
  };

  const handleClose = () => {
    onOpenChange(false);
    setDescription('');
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 rounded-lg">
              <Sparkles className="h-4 w-4 text-indigo-600" />
            </div>
            Générer un devis avec l'IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Zone de description */}
          {!result && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Décrivez le chantier en quelques mots
                </label>
                <p className="text-xs text-gray-400">
                  Décrivez librement : nature des travaux, quantités, matériaux, contraintes.
                  L'IA génère les lignes de devis correspondantes.
                </p>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={PLACEHOLDER}
                  rows={6}
                  className="resize-none text-sm"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 bg-blue-50 rounded-lg px-3 py-2">
                <Mic className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                Astuce : copiez-collez directement la retranscription d'une note vocale enregistrée sur le chantier.
              </div>
            </>
          )}

          {/* Résultats IA */}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-800">
                    Sujet : <span className="text-indigo-700">{result.subject}</span>
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs ${confidenceConfig[result.confidence as keyof typeof confidenceConfig]?.className}`}
                >
                  {confidenceConfig[result.confidence as keyof typeof confidenceConfig]?.label}
                </Badge>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Désignation</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Qté</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-600">Unité</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">P.U. HT</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">TVA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.lines.map((line, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 text-gray-800">{line.designation}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{line.quantity}</td>
                        <td className="px-3 py-2 text-center text-gray-500">{line.unit}</td>
                        <td className="px-3 py-2 text-right font-medium">
                          {line.unitPrice.toLocaleString('fr-FR')} €
                        </td>
                        <td className="px-3 py-2 text-right text-gray-500">{line.vatRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-gray-400 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Vérifiez et ajustez les montants avant validation — l'IA peut se tromper sur les prix.
              </p>

              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 text-xs"
                onClick={() => setResult(null)}
              >
                ← Modifier la description
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Annuler</Button>
          {!result ? (
            <Button
              onClick={handleGenerate}
              disabled={!description.trim() || extractMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              {extractMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours…</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Générer les lignes</>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleApply}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Importer {result.lines.length} ligne(s)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
