import { mockInterventions } from '@/services/terrainData';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function TerrainPhotos() {
  const allPhotos = mockInterventions.flatMap(i =>
    i.photos.map(p => ({ ...p, interventionTitle: i.title, jobRef: i.jobRef }))
  );

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Photos</h1>
          <p className="text-xs text-muted-foreground">{allPhotos.length} photo{allPhotos.length > 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => toast.info('Prise de photo')}>
          <Camera className="h-3.5 w-3.5" /> Prendre
        </Button>
      </div>

      {allPhotos.length === 0 ? (
        <div className="text-center py-12">
          <Camera className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Aucune photo pour le moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {allPhotos.map(photo => (
            <div key={photo.id} className="bg-card border rounded-xl overflow-hidden">
              <div className="aspect-square bg-muted flex items-center justify-center">
                <Camera className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <div className="px-3 py-2">
                <div className="text-xs font-medium truncate">{photo.name}</div>
                <div className="text-[10px] text-muted-foreground">{photo.jobRef}</div>
                <div className="text-[10px] text-muted-foreground">
                  {new Date(photo.timestamp).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
