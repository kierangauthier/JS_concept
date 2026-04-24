/**
 * AiReminderDraft — Bouton + Dialog qui génère une relance personnalisée
 * pour une facture en retard via l'IA.
 *
 * Usage dans la page Invoicing :
 *   <AiReminderDraft invoiceId={invoice.id} onDraftReady={(subject, body) => { ... }} />
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { useDraftReminder } from '@/services/api/hooks';

interface Props {
  invoiceId: string;
  invoiceRef: string;
  onDraftReady: (subject: string, body: string) => void;
}

const toneConfig = {
  courteous: { label: '1ère relance — Courtois',    className: 'bg-blue-100 text-blue-700' },
  firm:      { label: '2ème relance — Ferme',        className: 'bg-orange-100 text-orange-700' },
  urgent:    { label: 'Relance urgente',              className: 'bg-red-100 text-red-700' },
};

export function AiReminderDraft({ invoiceId, invoiceRef, onDraftReady }: Props) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [tone, setTone] = useState<string>('');
  const draftMutation = useDraftReminder();

  const handleGenerate = async () => {
    setSubject('');
    setBody('');
    setTone('');
    try {
      const data = await draftMutation.mutateAsync(invoiceId);
      setSubject(data.subject);
      setBody(data.body);
      setTone(data.tone);
    } catch {
      // Erreur gérée par le hook
    }
  };

  const handleOpen = () => {
    setOpen(true);
    handleGenerate();
  };

  const handleApply = () => {
    onDraftReady(subject, body);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
        onClick={handleOpen}
        title="Rédiger la relance avec l'IA"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Relance IA
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 rounded-lg">
                <Sparkles className="h-4 w-4 text-indigo-600" />
              </div>
              Relance IA — {invoiceRef}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {draftMutation.isPending && (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-indigo-600">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Rédaction en cours…</p>
              </div>
            )}

            {!draftMutation.isPending && subject && (
              <>
                <div className="flex items-center justify-between">
                  {tone && toneConfig[tone as keyof typeof toneConfig] && (
                    <Badge variant="outline" className={`text-xs ${toneConfig[tone as keyof typeof toneConfig].className}`}>
                      {toneConfig[tone as keyof typeof toneConfig].label}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-gray-400 gap-1 ml-auto"
                    onClick={handleGenerate}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Régénérer
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Objet</Label>
                  <Input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Message</Label>
                  <Textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={10}
                    className="text-sm resize-none"
                  />
                </div>

                <p className="text-xs text-gray-400">
                  Vous pouvez modifier le texte avant de l'utiliser.
                </p>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button
              onClick={handleApply}
              disabled={!subject || !body || draftMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Utiliser ce message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
