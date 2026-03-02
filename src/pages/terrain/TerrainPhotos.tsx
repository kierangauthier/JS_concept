import { useState } from 'react';
import { useJobs, useJobPhotos } from '@/services/api/hooks';
import { useFilterByCompany } from '@/contexts/AppContext';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { jobsApi } from '@/services/api/jobs.api';

export default function TerrainPhotos() {
  const { data: apiJobs, isLoading: loadingJobs } = useJobs();
  const activeJobs = useFilterByCompany(apiJobs ?? []).filter(j => ['in_progress', 'planned'].includes(j.status));

  if (loadingJobs) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-48 mt-1" /></div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Photos</h1>
          <p className="text-xs text-muted-foreground">{activeJobs.length} chantier{activeJobs.length > 1 ? 's' : ''} actif{activeJobs.length > 1 ? 's' : ''}</p>
        </div>
        <Link to="/terrain">
          <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Camera className="h-3.5 w-3.5" /> Prendre
          </Button>
        </Link>
      </div>

      {activeJobs.length === 0 ? (
        <div className="text-center py-12">
          <Camera className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Aucun chantier actif</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeJobs.map(job => (
            <JobPhotoSection key={job.id} jobId={job.id} jobRef={job.reference} jobTitle={job.title} />
          ))}
        </div>
      )}
    </div>
  );
}

function JobPhotoSection({ jobId, jobRef, jobTitle }: { jobId: string; jobRef: string; jobTitle: string }) {
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
        <Skeleton className="h-4 w-40 mb-3" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="aspect-square rounded-md" />)}
        </div>
      </div>
    );
  }

  if (!photos || photos.length === 0) return null;

  return (
    <div className="bg-card border rounded-xl p-4">
      <div className="mb-3">
        <div className="text-xs font-bold font-mono">{jobRef}</div>
        <div className="text-sm font-medium truncate">{jobTitle}</div>
        <div className="text-[10px] text-muted-foreground">{photos.length} photo{photos.length > 1 ? 's' : ''}</div>
      </div>
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
