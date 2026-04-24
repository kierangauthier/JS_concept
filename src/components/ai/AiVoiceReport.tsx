/**
 * AiVoiceReport — WOW 2 : Rapport vocal terrain → intervention structurée
 * Le technicien parle / tape → rapport rédigé + pointages créés
 */

import { useState, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Mic, MicOff, Loader2, CheckCircle2, AlertCircle, FileText, Clock, Wrench,
} from 'lucide-react';
import { api } from '@/services/api';

interface VoiceResult {
  reportText: string;
  hoursWorked: number;
  progressPercent: number | null;
  productsUsed: string[];
  observations: string;
  nextSteps: string;
  timeEntryDescription: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  currentProgress: number;
  onApply: (result: VoiceResult) => void;
}

export default function AiVoiceReport({ open, onClose, jobId, jobTitle, currentProgress, onApply }: Props) {
  const [step, setStep] = useState<'input' | 'result'>('input');
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Web Speech API pour la dictée vocale (disponible sur Chrome/Edge)
  const recognitionRef = useRef<any>(null);

  function toggleRecording() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('La dictée vocale n\'est pas disponible sur ce navigateur. Tape ton compte-rendu directement.');
      return;
    }

    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'fr-FR';
    rec.continuous = true;
    rec.interimResults = false;

    rec.onresult = (event: any) => {
      const text = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(' ');
      setTranscript(prev => prev ? prev + ' ' + text : text);
    };
    rec.onerror = () => { setRecording(false); };
    rec.onend = () => { setRecording(false); };

    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
  }

  async function handleAnalyze() {
    if (!transcript.trim()) {
      setError('Tape ou dicte ton compte-rendu d\'intervention.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<VoiceResult>('/api/ai/voice-report', {
        transcript,
        jobId,
        date: new Date().toISOString(),
      });
      setResult(res.data);
      setStep('result');
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de l\'analyse');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    onClose();
    setTimeout(() => {
      setStep('input');
      setTranscript('');
      setResult(null);
      setError(null);
    }, 200);
  }

  const exampleHints = [
    'J\'ai posé 12 panneaux directionnels RD345 km 3, scellement 3 poteaux, tout est conforme. 8h de travail.',
    'Marquage giratoire Berthelot terminé à 80%, il reste les passages piétons côté ouest. J\'ai bossé 7h aujourd\'hui.',
    'Balisage Pont Lafayette — pose cônes K5a et barrières section A, RAS. 2h d\'intervention.',
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-blue-500" />
            Rapport d'intervention vocal
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-1">{jobTitle}</p>
        </DialogHeader>

        {step === 'input' && (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Parle ou tape ton compte-rendu — l'IA structure tout automatiquement.
                </p>
                <Button
                  size="sm"
                  variant={recording ? 'destructive' : 'outline'}
                  onClick={toggleRecording}
                  className="gap-1.5 shrink-0"
                >
                  {recording ? <><MicOff className="h-4 w-4" /> Arrêter</> : <><Mic className="h-4 w-4" /> Dicter</>}
                </Button>
              </div>

              {recording && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded p-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  Enregistrement en cours… parle normalement
                </div>
              )}

              <Textarea
                placeholder="Ex: J'ai posé 12 panneaux directionnels RD345 km 3 chez la Métropole, scellé 3 poteaux, tout est conforme. Chantier à 60%, il reste la section km 5. J'ai bossé 8h."
                rows={5}
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                className="font-medium"
              />

              {/* Exemples rapides */}
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Exemples :</p>
                {exampleHints.map((hint, i) => (
                  <button key={i} onClick={() => setTranscript(hint)}
                    className="w-full text-left text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded p-1.5 transition-colors truncate">
                    "{hint}"
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded p-2">
                <AlertCircle className="h-4 w-4 shrink-0" />{error}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Annuler</Button>
              <Button onClick={handleAnalyze} disabled={loading || !transcript.trim()} className="gap-2">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyse...</> : <><FileText className="h-4 w-4" /> Structurer le rapport</>}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'result' && result && (
          <>
            <div className="space-y-4">
              {/* Rapport rédigé */}
              <div className="rounded-lg border bg-blue-50 border-blue-100 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
                  <FileText className="h-4 w-4" /> Compte-rendu d'intervention
                </div>
                <p className="text-sm text-gray-700">{result.reportText}</p>
              </div>

              {/* Métriques extraites */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded border p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="h-3.5 w-3.5" /> Heures pointées
                  </div>
                  <div className="text-2xl font-bold">{result.hoursWorked}h</div>
                  <div className="text-xs text-gray-400">{result.timeEntryDescription}</div>
                </div>
                <div className="rounded border p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Wrench className="h-3.5 w-3.5" /> Avancement
                  </div>
                  <div className="text-2xl font-bold">
                    {result.progressPercent !== null ? `${result.progressPercent}%` : `${currentProgress}% (inchangé)`}
                  </div>
                  {result.progressPercent !== null && currentProgress !== result.progressPercent && (
                    <div className="text-xs text-green-600">+{result.progressPercent - currentProgress}% depuis dernière mise à jour</div>
                  )}
                </div>
              </div>

              {/* Produits utilisés */}
              {result.productsUsed.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">Références produits mentionnées</div>
                  <div className="flex flex-wrap gap-1">
                    {result.productsUsed.map(p => (
                      <Badge key={p} variant="secondary" className="font-mono text-xs">{p}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Observations */}
              {result.observations && (
                <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                  ⚠️ <strong>Points d'attention :</strong> {result.observations}
                </div>
              )}

              {/* Prochaines étapes */}
              {result.nextSteps && (
                <div className="text-sm text-gray-600">
                  <strong>Prochaines étapes :</strong> {result.nextSteps}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep('input')}>← Corriger</Button>
              <Button onClick={() => { onApply(result); handleClose(); }} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Valider et enregistrer
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
