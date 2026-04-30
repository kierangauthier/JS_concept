import { useRef, useState } from 'react';
import {
  useJobs, useJobPhotos, usePresignJobPhoto, useCreateJobPhoto,
} from '@/services/api/hooks';
import { useFilterByCompany } from '@/contexts/AppContext';
import { Camera, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { jobsApi } from '@/services/api/jobs.api';
import { plural } from '@/lib/format';
import { useQueryClient } from '@tanstack/react-query';
import { PullToRefresh } from '@/components/terrain/PullToRefresh';
import { toast } from 'sonner';

export default function TerrainPhotos() {
  const queryClient = useQueryClient();
  const { data: apiJobs, isLoading: loadingJobs } = useJobs();
  // The audit reported a count/list mismatch (B-NEW-11) — both the header
  // count and the body now read from the same activeJobs array, and we render
  // a card per active job even when it has zero photos so the user has a
  // concrete place to attach the first one.
  const activeJobs = useFilterByCompany(apiJobs ?? []).filter(
    j => j.status === 'in_progress' || j.status === 'planned',
  );
  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['jobs'] }),
      queryClient.invalidateQueries({ queryKey: ['job-photos'] }),
    ]);
  };

  if (loadingJobs) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-48 mt-1" /></div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold">Photos</h1>
        <p className="text-xs text-muted-foreground">
          {plural(activeJobs.length, 'chantier actif', 'chantiers actifs')}
        </p>
      </div>

      {activeJobs.length === 0 ? (
        <div className="text-center py-12">
          <Camera className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Aucun chantier actif</p>
          <p className="text-xs text-muted-foreground mt-1">Démarrez un chantier pour pouvoir y attacher des photos.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeJobs.map(job => (
            <JobPhotoSection key={job.id} jobId={job.id} jobRef={job.reference} jobTitle={job.title} jobAddress={job.address} />
          ))}
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}

function JobPhotoSection({
  jobId, jobRef, jobTitle, jobAddress,
}: { jobId: string; jobRef: string; jobTitle: string; jobAddress: string }) {
  const queryClient = useQueryClient();
  const { data: photos, isLoading } = useJobPhotos(jobId);
  const presign = usePresignJobPhoto();
  const createPhoto = useCreateJobPhoto();
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadPhotoUrl(photoId: string) {
    if (photoUrls[photoId] || loadingUrls[photoId]) return;
    setLoadingUrls(prev => ({ ...prev, [photoId]: true }));
    try {
      const { downloadUrl } = await jobsApi.getPhotoUrl(jobId, photoId);
      setPhotoUrls(prev => ({ ...prev, [photoId]: downloadUrl }));
    } catch {
      // ignore — image stays as a loader; the next refresh will retry.
    } finally {
      setLoadingUrls(prev => ({ ...prev, [photoId]: false }));
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format non autorisé. Utilisez JPEG, PNG, WebP ou HEIC.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Le fichier dépasse 20 Mo.');
      return;
    }

    setUploading(true);
    const loadingToast = toast.loading('Envoi de la photo…');
    try {
      const { uploadUrl, storageKey } = await presign.mutateAsync({
        jobId,
        data: { filename: file.name, contentType: file.type },
      });
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      await createPhoto.mutateAsync({
        jobId,
        data: { storageKey, filename: file.name, contentType: file.type, sizeBytes: file.size },
      });
      // useCreateJobPhoto already invalidates ['job-photos', jobId] and toasts
      // success ('Photo ajoutée'). We dismiss the loading toast explicitly.
      toast.dismiss(loadingToast);
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err?.message ?? "Échec de l'envoi de la photo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="bg-card border rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-xs font-bold font-mono">{jobRef}</div>
          <div className="text-sm font-medium truncate">{jobTitle}</div>
          {jobAddress && <div className="text-[10px] text-muted-foreground truncate">{jobAddress}</div>}
          <div className="text-[10px] text-muted-foreground mt-1">
            {photos ? plural(photos.length, 'photo') : 'chargement…'}
          </div>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            capture="environment"
            onChange={handleFileSelected}
            className="hidden"
          />
          <Button
            size="sm"
            className="h-11 gap-1.5"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label={`Ajouter une photo au chantier ${jobRef}`}
          >
            {uploading
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Envoi…</>
              : <><Camera className="h-3.5 w-3.5" />Ajouter</>}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="aspect-square rounded-md" />)}
        </div>
      ) : !photos || photos.length === 0 ? (
        <div className="rounded-lg border border-dashed py-6 px-3 text-center">
          <Camera className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1.5" />
          <p className="text-xs text-muted-foreground">Aucune photo pour l'instant</p>
          <p className="text-[10px] text-muted-foreground/70">Tapez « Ajouter » pour la première.</p>
        </div>
      ) : (
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
      )}
    </div>
  );
}
