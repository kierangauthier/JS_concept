import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMyPlanning, useJobPhotos, useJobs } from '@/services/api/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Clock, Camera, Play, Pause, Square, Mic, PenTool, MessageSquare, Navigation, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { jobsApi } from '@/services/api/jobs.api';
import { signaturesApi } from '@/services/api/signatures.api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNetworkStatus } from '@/services/offline/networkStatus';
import { useOfflineMutation } from '@/services/offline/hooks';
import { offlineDb } from '@/services/offline/db';
import { compressPhoto, checkPhotoLimit } from '@/services/offline/imageCompressor';
import { timeEntriesApi, CreateTimeEntryPayload } from '@/services/api/time-entries.api';
import { toISODateLocal } from '@/lib/format';

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return toISODateLocal(d);
}

export default function InterventionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const weekStart = useMemo(() => getWeekStart(new Date()), []);
  const { data: planning, isLoading: loadingPlanning } = useMyPlanning(weekStart);
  const { data: apiJobs } = useJobs();

  const slot = planning?.slots.find(s => s.id === id);
  const job = apiJobs?.find(j => j.reference === slot?.jobRef);

  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [showSignature, setShowSignature] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sigName, setSigName] = useState('');
  const [sigSaving, setSigSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOnline = useNetworkStatus();
  const createTimeEntry = useOfflineMutation<any, CreateTimeEntryPayload>(
    'timeEntry',
    '/time-entries',
    (data) => timeEntriesApi.create(data),
  );
  const queryClient = useQueryClient();

  async function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !job) return;

    setUploading(true);
    try {
      // Check photo limit
      const { allowed, count, warning } = await checkPhotoLimit(job.id);
      if (!allowed) {
        toast.error(`Limite de 30 photos atteinte (${count}/30)`);
        return;
      }
      if (warning) {
        toast.warning(`${count}/30 photos — limite bientot atteinte`);
      }

      // Compress photo
      const compressed = await compressPhoto(file);

      if (isOnline) {
        // Online: direct upload
        const { uploadUrl, storageKey } = await jobsApi.presignPhoto(job.id, {
          filename: file.name,
          contentType: 'image/jpeg',
        });
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'image/jpeg' },
          body: compressed,
        });
        await jobsApi.createPhoto(job.id, {
          storageKey,
          filename: file.name,
          contentType: 'image/jpeg',
          sizeBytes: compressed.size,
        });
        queryClient.invalidateQueries({ queryKey: ['job-photos', job.id] });
        toast.success('Photo enregistree');
      } else {
        // Offline: queue for later sync
        const blobId = crypto.randomUUID();
        await offlineDb.blobs.add({
          id: blobId,
          blob: compressed,
          filename: file.name,
          contentType: 'image/jpeg',
          sizeBytes: compressed.size,
        });
        await offlineDb.mutations.add({
          id: crypto.randomUUID(),
          idempotencyKey: crypto.randomUUID(),
          type: 'photo',
          endpoint: `/jobs/${job.id}/photos`,
          method: 'POST',
          payload: { jobId: job.id },
          blobKey: blobId,
          jobId: job.id,
          createdAt: Date.now(),
          retries: 0,
          status: 'pending',
        });
        toast.info('Photo sauvegardee hors-ligne');
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur upload photo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerState === 'running') {
      interval = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerState]);

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleStopTimer = useCallback(async () => {
    if (elapsed < 60) {
      toast.warning('Duree trop courte (< 1 minute)');
      setTimerState('idle');
      return;
    }
    const hours = Math.round((elapsed / 3600) * 4) / 4; // Round to 0.25h
    if (job) {
      try {
        await createTimeEntry.mutateAsync({
          jobId: job.id,
          date: new Date().toISOString(),
          hours,
          description: slot?.jobTitle ?? 'Intervention terrain',
        });
        toast.success(`${hours}h enregistrees pour ${slot?.jobRef}`);
      } catch {
        toast.error("Erreur lors de l'enregistrement");
      }
    } else {
      toast.success(`${formatElapsed(elapsed)} enregistrees`);
    }
    setTimerState('idle');
    setElapsed(0);
  }, [elapsed, job, slot, createTimeEntry]);

  if (loadingPlanning) {
    return (
      <div className="max-w-lg mx-auto space-y-4 pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1"><Skeleton className="h-5 w-48" /><Skeleton className="h-3 w-24 mt-1" /></div>
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!slot) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-muted-foreground">Intervention non trouvée</p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-4">
      {/* Back header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full bg-card border flex items-center justify-center active:scale-95 transition-transform">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate">{slot.jobTitle}</h1>
          <span className="text-xs font-mono text-muted-foreground">{slot.jobRef}</span>
        </div>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary-foreground">
          {slot.startHour}h-{slot.endHour}h
        </span>
      </div>

      {/* Info card */}
      <div className="bg-card border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Équipe : {slot.teamName}</span>
        </div>
        {slot.jobAddress && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{slot.jobAddress}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{slot.startHour}h00 - {slot.endHour}h00</span>
        </div>
        {slot.jobAddress && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs gap-1.5"
            onClick={() => {
              const encoded = encodeURIComponent(slot.jobAddress);
              window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, '_blank');
            }}
          >
            <Navigation className="h-3.5 w-3.5" /> Itinéraire
          </Button>
        )}
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
              <Button className="flex-1 gap-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={handleStopTimer}>
                <Square className="h-4 w-4" /> Arrêter
              </Button>
            </>
          )}
          {timerState === 'paused' && (
            <>
              <Button className="flex-1 gap-1.5 bg-success hover:bg-success/90 text-success-foreground" onClick={() => setTimerState('running')}>
                <Play className="h-4 w-4" /> Reprendre
              </Button>
              <Button className="flex-1 gap-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={handleStopTimer}>
                <Square className="h-4 w-4" /> Arrêter
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Action buttons grid */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="h-14 flex-col gap-1 rounded-xl active:scale-[0.97] transition-transform"
          disabled={uploading || !job}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
          <span className="text-[10px] font-medium">{uploading ? 'Envoi…' : 'Photo'}</span>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhotoCapture}
        />
        <Button variant="outline" className="h-14 flex-col gap-1 rounded-xl active:scale-[0.97] transition-transform" onClick={() => toast.info('Bientôt disponible')}>
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

      {/* Note */}
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

      {/* Job photos */}
      {job && <JobPhotoGallery jobId={job.id} />}

      {/* Signature drawer */}
      <Sheet open={showSignature} onOpenChange={(open) => { setShowSignature(open); if (!open) setSigName(''); }}>
        <SheetContent side="bottom" className="rounded-t-2xl h-[70vh]">
          <SheetHeader>
            <SheetTitle>Signature client</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="sig-name">Nom du signataire *</Label>
              <Input id="sig-name" value={sigName} onChange={e => setSigName(e.target.value)} placeholder="Nom du client" />
            </div>
            <canvas
              ref={canvasRef}
              width={340}
              height={180}
              className="w-full border-2 border-dashed rounded-xl bg-white touch-none cursor-crosshair"
              onPointerDown={(e) => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                isDrawingRef.current = true;
                const ctx = canvas.getContext('2d')!;
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                ctx.beginPath();
                ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
                canvas.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!isDrawingRef.current) return;
                const canvas = canvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext('2d')!;
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.strokeStyle = '#000';
                ctx.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
                ctx.stroke();
              }}
              onPointerUp={() => { isDrawingRef.current = false; }}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  const canvas = canvasRef.current;
                  if (canvas) canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
                }}
              >
                Effacer
              </Button>
            </div>
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={() => setShowSignature(false)}>Annuler</Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={sigSaving || !sigName.trim() || !job}
                onClick={async () => {
                  const canvas = canvasRef.current;
                  if (!canvas || !job || !sigName.trim()) return;
                  setSigSaving(true);
                  try {
                    const blob = await new Promise<Blob>((resolve) =>
                      canvas.toBlob((b) => resolve(b!), 'image/png')
                    );

                    if (isOnline) {
                      const result = await signaturesApi.create({
                        jobId: job.id,
                        interventionDate: new Date().toISOString(),
                        signatoryName: sigName.trim(),
                      });
                      await fetch(result.uploadUrl, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'image/png' },
                        body: blob,
                      });
                      toast.success('Signature enregistree');
                    } else {
                      // Offline: queue
                      const blobId = crypto.randomUUID();
                      await offlineDb.blobs.add({
                        id: blobId,
                        blob,
                        filename: 'signature.png',
                        contentType: 'image/png',
                        sizeBytes: blob.size,
                      });
                      await offlineDb.mutations.add({
                        id: crypto.randomUUID(),
                        idempotencyKey: crypto.randomUUID(),
                        type: 'signature',
                        endpoint: '/signatures',
                        method: 'POST',
                        payload: {
                          jobId: job.id,
                          interventionDate: new Date().toISOString(),
                          signatoryName: sigName.trim(),
                        },
                        blobKey: blobId,
                        jobId: job.id,
                        createdAt: Date.now(),
                        retries: 0,
                        status: 'pending',
                      });
                      toast.info('Signature sauvegardee hors-ligne');
                    }
                    setShowSignature(false);
                    setSigName('');
                    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
                  } catch (err: any) {
                    toast.error(err.message ?? 'Erreur signature');
                  } finally {
                    setSigSaving(false);
                  }
                }}
              >
                {sigSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Valider
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function JobPhotoGallery({ jobId }: { jobId: string }) {
  const { data: photos, isLoading } = useJobPhotos(jobId);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState<Record<string, boolean>>({});

  async function loadPhotoUrl(photoId: string) {
    if (photoUrls[photoId] || loadingUrls[photoId]) return;
    setLoadingUrls(prev => ({ ...prev, [photoId]: true }));
    try {
      const { downloadUrl } = await jobsApi.getPhotoUrl(jobId, photoId);
      setPhotoUrls(prev => ({ ...prev, [photoId]: downloadUrl }));
    } catch {
      // ignore
    } finally {
      setLoadingUrls(prev => ({ ...prev, [photoId]: false }));
    }
  }

  if (isLoading) {
    return (
      <div className="bg-card border rounded-xl p-4">
        <Skeleton className="h-4 w-24 mb-3" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="aspect-square rounded-md" />)}
        </div>
      </div>
    );
  }

  if (!photos || photos.length === 0) return null;

  return (
    <div className="bg-card border rounded-xl p-4">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Photos ({photos.length})</div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map(photo => {
          if (!photoUrls[photo.id] && !loadingUrls[photo.id]) {
            loadPhotoUrl(photo.id);
          }
          return (
            <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              {photoUrls[photo.id] ? (
                <img src={photoUrls[photo.id]} alt={photo.filename} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                <div className="text-[9px] text-white truncate">{photo.filename}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
