import { Upload, FileText, Image, X, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FileItem {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'doc';
  size: string;
  uploadedBy: string;
  uploadedAt: string;
}

interface FileUploaderProps {
  files: FileItem[];
  onUpload?: () => void;
  compact?: boolean;
}

const typeIcons: Record<string, React.ElementType> = {
  pdf: FileText,
  image: Image,
  doc: File,
};

const typeColors: Record<string, string> = {
  pdf: 'text-destructive',
  image: 'text-info',
  doc: 'text-muted-foreground',
};

export function FileUploader({ files, onUpload, compact = false }: FileUploaderProps) {
  return (
    <div className="space-y-3">
      {/* Upload zone */}
      <button
        onClick={() => { onUpload?.(); toast.info('Upload fichier (placeholder)'); }}
        className={`w-full border-2 border-dashed rounded-lg flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors ${
          compact ? 'py-3 px-4' : 'py-6 px-4'
        }`}
      >
        <Upload className="h-4 w-4" />
        <span className="text-sm">Glisser un fichier ou cliquer pour uploader</span>
      </button>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map(file => {
            const Icon = typeIcons[file.type] || File;
            return (
              <div key={file.id} className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/40 hover:bg-muted/70 transition-colors group">
                <Icon className={`h-4 w-4 flex-shrink-0 ${typeColors[file.type]}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{file.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {file.size} · {file.uploadedBy} · {new Date(file.uploadedAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => toast.info(`Téléchargement de ${file.name}`)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
