import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockInterventions, interventionTypeLabels, interventionStatusLabels, interventionStatusColors, interventionTypeColors, Intervention, ChecklistItem } from '@/services/terrainData';
import { ArrowLeft, MapPin, Clock, Camera, Play, Pause, Square, CheckCircle2, Circle, Mic, PenTool, User, MessageSquare, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export default function InterventionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const intervention = mockInterventions.find(i => i.id === id);

  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [showSignature, setShowSignature] = useState(false);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    if (intervention) {
      setChecklist(intervention.checklist.map(c => ({ ...c })));
    }
  }, [intervention]);

  // Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerState === 'running') {
      interval = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerState]);

  const toggleCheck = useCallback((itemId: string) => {
    setChecklist(prev => prev.map(c => c.id === itemId ? { ...c, checked: !c.checked } : c));
  }, []);

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (!intervention) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Intervention non trouvée</p>
      </div>
    );
  }

  const checkedCount = checklist.filter(c => c.checked).length;
  const requiredUnchecked = checklist.filter(c => c.required && !c.checked).length;

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-4">
      {/* Back header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full bg-card border flex items-center justify-center active:scale-95 transition-transform">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate">{intervention.title}</h1>
          <span className="text-xs font-mono text-muted-foreground">{intervention.jobRef}</span>
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${interventionStatusColors[intervention.status]}`}>
          {interventionStatusLabels[intervention.status]}
        </span>
      </div>

      {/* Info card */}
      <div className="bg-card border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${interventionTypeColors[intervention.type]}`}>
            {interventionTypeLabels[intervention.type]}
          </span>
          <span className="text-xs text-muted-foreground">{intervention.clientName}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{intervention.address}, {intervention.city}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{new Date(intervention.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · ~{Math.floor(intervention.estimatedDuration / 60)}h{intervention.estimatedDuration % 60 > 0 ? (intervention.estimatedDuration % 60).toString().padStart(2, '0') : ''}</span>
        </div>
        {intervention.notes && (
          <div className="bg-muted/50 rounded-lg p-2.5 text-xs text-muted-foreground">
            <strong className="text-foreground">Note :</strong> {intervention.notes}
          </div>
        )}
        <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" onClick={() => toast.info('Ouverture navigation GPS')}>
          <Navigation className="h-3.5 w-3.5" /> Itinéraire
        </Button>
      </div>

      {/* Timer */}
      <div className="bg-card border rounded-xl p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Compteur d'heures</div>
        <div className="text-center mb-4">
          <div className="text-4xl font-mono font-bold tracking-wider">{formatElapsed(elapsed)}</div>
        </div>
        <div className="flex gap-2">
          {timerState === 'idle' && (
            <Button className="flex-1 gap-1.5 bg-success hover:bg-success/90 text-success-foreground" onClick={() => setTimerState('running')}>
              <Play className="h-4 w-4" /> Démarrer
            </Button>
          )}
          {timerState === 'running' && (
            <>
              <Button variant="outline" className="flex-1 gap-1.5" onClick={() => setTimerState('paused')}>
                <Pause className="h-4 w-4" /> Pause
              </Button>
              <Button className="flex-1 gap-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => { setTimerState('idle'); toast.success(`${formatElapsed(elapsed)} enregistrées`); }}>
                <Square className="h-4 w-4" /> Arrêter
              </Button>
            </>
          )}
          {timerState === 'paused' && (
            <>
              <Button className="flex-1 gap-1.5 bg-success hover:bg-success/90 text-success-foreground" onClick={() => setTimerState('running')}>
                <Play className="h-4 w-4" /> Reprendre
              </Button>
              <Button className="flex-1 gap-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => { setTimerState('idle'); toast.success(`${formatElapsed(elapsed)} enregistrées`); }}>
                <Square className="h-4 w-4" /> Arrêter
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Checklist</div>
          <span className="text-xs text-muted-foreground font-medium">{checkedCount}/{checklist.length}</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
          <div className={`h-full rounded-full transition-all ${checkedCount === checklist.length ? 'bg-success' : 'bg-primary'}`}
            style={{ width: `${(checkedCount / checklist.length) * 100}%` }} />
        </div>
        <div className="space-y-1">
          {checklist.map(item => (
            <button
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors active:scale-[0.98] ${
                item.checked ? 'bg-success/5' : 'bg-muted/30 hover:bg-muted/50'
              }`}
            >
              {item.checked ? (
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
              ) : (
                <Circle className={`h-5 w-5 flex-shrink-0 ${item.required ? 'text-foreground' : 'text-muted-foreground'}`} />
              )}
              <span className={`text-sm ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                {item.label}
              </span>
              {item.required && !item.checked && (
                <span className="text-[9px] font-bold text-destructive ml-auto">*</span>
              )}
            </button>
          ))}
        </div>
        {requiredUnchecked > 0 && (
          <p className="text-[10px] text-destructive mt-2">* {requiredUnchecked} élément{requiredUnchecked > 1 ? 's' : ''} obligatoire{requiredUnchecked > 1 ? 's' : ''} restant{requiredUnchecked > 1 ? 's' : ''}</p>
        )}
      </div>

      {/* Action buttons grid */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-14 flex-col gap-1 rounded-xl active:scale-[0.97] transition-transform" onClick={() => toast.info('Prise de photo (placeholder)')}>
          <Camera className="h-5 w-5" />
          <span className="text-[10px] font-medium">Photo ({intervention.photos.length})</span>
        </Button>
        <Button variant="outline" className="h-14 flex-col gap-1 rounded-xl active:scale-[0.97] transition-transform" onClick={() => toast.info('Note vocale (placeholder)')}>
          <Mic className="h-5 w-5" />
          <span className="text-[10px] font-medium">Note vocale</span>
        </Button>
        <Button variant="outline" className="h-14 flex-col gap-1 rounded-xl active:scale-[0.97] transition-transform" onClick={() => setShowSignature(true)}>
          <PenTool className="h-5 w-5" />
          <span className="text-[10px] font-medium">Signature client</span>
        </Button>
        <Button variant="outline" className="h-14 flex-col gap-1 rounded-xl active:scale-[0.97] transition-transform" onClick={() => toast.info('Commentaire ajouté')}>
          <MessageSquare className="h-5 w-5" />
          <span className="text-[10px] font-medium">Commentaire</span>
        </Button>
      </div>

      {/* Add note inline */}
      <div className="bg-card border rounded-xl p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Note rapide</div>
        <textarea
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          placeholder="Ajouter une observation…"
          className="w-full bg-muted/30 border-0 rounded-lg p-3 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {noteText && (
          <Button size="sm" className="mt-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => { toast.success('Note enregistrée'); setNoteText(''); }}>
            Enregistrer
          </Button>
        )}
      </div>

      {/* Photos already taken */}
      {intervention.photos.length > 0 && (
        <div className="bg-card border rounded-xl p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Photos ({intervention.photos.length})</div>
          <div className="grid grid-cols-3 gap-2">
            {intervention.photos.map(photo => (
              <div key={photo.id} className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                <Camera className="h-6 w-6 text-muted-foreground/40" />
              </div>
            ))}
            <button
              onClick={() => toast.info('Ajout photo')}
              className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors active:scale-95"
            >
              <Camera className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {/* Signature placeholder drawer */}
      <Sheet open={showSignature} onOpenChange={setShowSignature}>
        <SheetContent side="bottom" className="rounded-t-2xl h-[60vh]">
          <SheetHeader>
            <SheetTitle>Signature client</SheetTitle>
          </SheetHeader>
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
            <div className="w-full h-48 border-2 border-dashed rounded-xl flex items-center justify-center bg-muted/20">
              <div className="text-center text-muted-foreground">
                <PenTool className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Zone de signature</p>
                <p className="text-xs">(placeholder — canvas à intégrer)</p>
              </div>
            </div>
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={() => setShowSignature(false)}>Annuler</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => { toast.success('Signature enregistrée'); setShowSignature(false); }}>Valider</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
