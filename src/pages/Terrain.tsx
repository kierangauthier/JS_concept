import { useState, useRef } from 'react';
import { useFilterByCompany, useApp } from '@/contexts/AppContext';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { CompanySelect } from '@/components/shared/CompanySelect';
import { MapPin, Clock, Camera, Plus, X, Image, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useJobs, useTimeEntries, useCreateTimeEntry, useJobPhotos, usePresignJobPhoto, useCreateJobPhoto, useDeleteJobPhoto } from '@/services/api/hooks';
import { jobsApi } from '@/services/api/jobs.api';
import { plural } from '@/lib/format';

export default function Terrain() {
  const { data: apiJobs, isLoading: loadingJobs } = useJobs();
  const { data: apiTimeEntries, isLoading: loadingTime } = useTimeEntries();
  const isLoading = loadingJobs || loadingTime;
  const jobs = useFilterByCompany(apiJobs ?? []).filter(j => j.status === 'in_progress');
  const timeEntries = useFilterByCompany(apiTimeEntries ?? []);
  const { selectedCompany } = useApp();

  const createTimeEntry = useCreateTimeEntry();
  const presignPhoto = usePresignJobPhoto();
  const createPhoto = useCreateJobPhoto();
  const deletePhoto = useDeleteJobPhoto();

  // Photo upload state
  const [photoFormOpen, setPhotoFormOpen] = useState(false);
  const [photoJobId, setPhotoJobId] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [expandedPhotoJobId, setExpandedPhotoJobId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoCompany, setPhotoCompany] = useState<'ASP' | 'JS'>('ASP');

  // Time entry form state
  const [formOpen, setFormOpen] = useState(false);
  const [formJobId, setFormJobId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formHours, setFormHours] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCompany, setFormCompany] = useState<'ASP' | 'JS'>('ASP');

  function openPhotoForm() {
    setPhotoJobId(jobs.length > 0 ? jobs[0].id : '');
    setPhotoFormOpen(true);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!photoJobId) { toast.error('Selectionnez un chantier'); return; }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Type de fichier non autorise. Utilisez JPEG, PNG ou WebP.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Le fichier depasse 20Mo');
      return;
    }

    setPhotoUploading(true);
    try {
      const scope = selectedCompany === 'GROUP' ? photoCompany : undefined;
      // Step 1: Get presigned URL
      const { uploadUrl, storageKey } = await presignPhoto.mutateAsync({
        jobId: photoJobId,
        data: { filename: file.name, contentType: file.type },
      });

      // Step 2: Upload to MinIO
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      // Step 3: Create attachment record
      await createPhoto.mutateAsync({
        jobId: photoJobId,
        data: {
          storageKey,
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        },
      });

      setPhotoFormOpen(false);
      setExpandedPhotoJobId(photoJobId);
    } catch (err) {
      // Error already handled by mutation hooks
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function openForm() {
    setFormJobId(jobs.length > 0 ? jobs[0].id : '');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormHours('');
    setFormDescription('');
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formJobId) { toast.error('Sélectionnez un chantier'); return; }
    const hours = parseFloat(formHours);
    if (!hours || hours <= 0) { toast.error('Saisissez un nombre d\'heures valide'); return; }
    if (!formDescription.trim()) { toast.error('Saisissez une description'); return; }

    const scope = selectedCompany === 'GROUP' ? formCompany : undefined;
    await createTimeEntry.mutateAsync({
      data: {
        jobId: formJobId,
        date: new Date(formDate).toISOString(),
        hours,
        description: formDescription.trim(),
      },
      companyScope: scope,
    });
    setFormOpen(false);
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-lg mx-auto">
        <div><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-48 mt-1" /></div>
        <div className="grid grid-cols-2 gap-3"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-bold">Vue Terrain</h1>
        <p className="text-sm text-muted-foreground">Feuille de route du jour</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-16 flex-col gap-1" onClick={openForm}>
          <Clock className="h-5 w-5" />
          <span className="text-xs">Pointer mes heures</span>
        </Button>
        <Button variant="outline" className="h-16 flex-col gap-1" onClick={openPhotoForm}>
          <Camera className="h-5 w-5" />
          <span className="text-xs">Photo chantier</span>
        </Button>
      </div>

      {/* Time entry form */}
      {formOpen && (
        <div className="bg-card border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Saisie d'heures</h3>
            <button
              onClick={() => setFormOpen(false)}
              className="h-12 w-12 flex items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <CompanySelect value={formCompany} onChange={setFormCompany} />
            <div className="space-y-1">
              <Label htmlFor="te-job" className="text-xs">Chantier *</Label>
              <Select value={formJobId} onValueChange={setFormJobId}>
                <SelectTrigger id="te-job"><SelectValue placeholder="Chantier" /></SelectTrigger>
                <SelectContent>
                  {jobs.map(j => (
                    <SelectItem key={j.id} value={j.id}>{j.reference} — {j.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="te-date" className="text-xs">Date *</Label>
                <Input id="te-date" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="te-hours" className="text-xs">Heures *</Label>
                <Input id="te-hours" type="number" min="0.5" step="0.5" value={formHours} onChange={e => setFormHours(e.target.value)} placeholder="8" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="te-desc" className="text-xs">Description *</Label>
              <Input id="te-desc" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Travaux effectués…" />
            </div>
            <Button type="submit" className="w-full h-12" disabled={createTimeEntry.isPending}>
              {createTimeEntry.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </form>
        </div>
      )}

      {/* Photo upload form */}
      {photoFormOpen && (
        <div className="bg-card border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Photo chantier</h3>
            <button
              onClick={() => setPhotoFormOpen(false)}
              className="h-12 w-12 flex items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <CompanySelect value={photoCompany} onChange={setPhotoCompany} />
          <div className="space-y-1">
            <Label htmlFor="photo-job" className="text-xs">Chantier *</Label>
            <Select value={photoJobId} onValueChange={setPhotoJobId}>
              <SelectTrigger id="photo-job"><SelectValue placeholder="Chantier" /></SelectTrigger>
              <SelectContent>
                {jobs.map(j => (
                  <SelectItem key={j.id} value={j.id}>{j.reference} -- {j.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              onChange={handlePhotoUpload}
              className="hidden"
              id="photo-input"
            />
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={photoUploading || !photoJobId}
            >
              {photoUploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Envoi en cours...</>
              ) : (
                <><Camera className="h-4 w-4" /> Choisir une photo</>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground mt-1">JPEG, PNG, WebP. Max 20Mo.</p>
          </div>
        </div>
      )}

      {/* Active jobs for today */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Chantiers actifs</h2>
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job.id} className="bg-card border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold font-mono">{job.reference}</span>
                <StatusBadge type="job" status={job.status} />
              </div>
              <h3 className="text-sm font-medium mb-1">{job.title}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {job.address}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${job.progress}%` }} />
                </div>
                <span className="text-xs font-medium">{job.progress}%</span>
              </div>
              {/* Photo toggle */}
              <div className="mt-3 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setExpandedPhotoJobId(expandedPhotoJobId === job.id ? null : job.id)}
                >
                  <Image className="h-3 w-3" />
                  {expandedPhotoJobId === job.id ? 'Masquer photos' : 'Voir photos'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => { setPhotoJobId(job.id); setPhotoFormOpen(true); }}
                >
                  <Camera className="h-3 w-3" /> Ajouter
                </Button>
              </div>
              {/* Photo gallery */}
              {expandedPhotoJobId === job.id && (
                <JobPhotoGallery jobId={job.id} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent time entries */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dernières heures</h2>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={openForm}>
            <Plus className="h-3 w-3" /> Ajouter
          </Button>
        </div>
        <div className="space-y-2">
          {timeEntries.slice(0, 5).map(te => (
            <div key={te.id} className="bg-card border rounded-lg px-3 py-2 flex items-center gap-3">
              <div className="text-xs font-medium text-muted-foreground w-16">{new Date(te.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium font-mono">{te.jobRef}</div>
                <div className="text-xs text-muted-foreground truncate">{te.description}</div>
              </div>
              <span className="text-sm font-bold">{te.hours}h</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Job Photo Gallery (inline sub-component) ────────────────────────────────

function JobPhotoGallery({ jobId }: { jobId: string }) {
  const { data: photos, isLoading } = useJobPhotos(jobId);
  const deletePhoto = useDeleteJobPhoto();
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
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[1, 2, 3].map(i => <Skeleton key={i} className="aspect-square rounded-md" />)}
      </div>
    );
  }

  if (!photos || photos.length === 0) {
    return (
      <div className="mt-3 text-center py-4 text-xs text-muted-foreground border rounded-md bg-muted/20">
        <Image className="h-8 w-8 mx-auto mb-1 opacity-30" />
        Aucune photo pour ce chantier
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="text-xs font-medium text-muted-foreground mb-2">
        {plural(photos.length, 'photo')}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map(photo => {
          // Load URL on render
          if (!photoUrls[photo.id] && !loadingUrls[photo.id]) {
            loadPhotoUrl(photo.id);
          }
          return (
            <div key={photo.id} className="relative group aspect-square rounded-md overflow-hidden bg-muted">
              {photoUrls[photo.id] ? (
                <img
                  src={photoUrls[photo.id]}
                  alt={photo.filename}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              <button
                onClick={() => deletePhoto.mutate({ jobId, photoId: photo.id })}
                className="absolute top-1 right-1 h-5 w-5 rounded bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
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
