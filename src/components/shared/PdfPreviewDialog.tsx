import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Download, AlertCircle } from 'lucide-react';

interface PdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Resolves the blob URL for the PDF. Called when the dialog opens. */
  fetchBlobUrl: () => Promise<string>;
  /** Optional direct download action (e.g. quotesApi.downloadPdf). */
  onDownload?: () => Promise<void> | void;
}

/**
 * Renders a PDF inside a modal via an iframe blob URL.
 * Used to let users verify the generated document before emailing or sending it.
 */
export function PdfPreviewDialog({ open, onOpenChange, title, fetchBlobUrl, onDownload }: PdfPreviewDialogProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Parents pass fetchBlobUrl as an inline arrow (new ref each render); pin it
  // so the effect only re-runs when `open` flips, not on every parent re-render.
  const fetchRef = useRef(fetchBlobUrl);
  fetchRef.current = fetchBlobUrl;

  useEffect(() => {
    if (!open) {
      setUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    let currentUrl: string | null = null;
    setLoading(true);
    setError(null);
    setUrl(null);
    fetchRef.current()
      .then(u => {
        if (cancelled) { URL.revokeObjectURL(u); return; }
        currentUrl = u;
        setUrl(u);
      })
      .catch(err => { if (!cancelled) setError(err?.message ?? 'Erreur lors de la génération du PDF'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [open]);

  const handleClose = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-[500px] bg-muted rounded border overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-destructive p-4 text-center">
              <AlertCircle className="h-8 w-8" />
              <div className="text-sm font-medium">{error}</div>
            </div>
          )}
          {url && !error && (
            <iframe
              src={url}
              title={title}
              className="w-full h-full"
              style={{ minHeight: '500px' }}
            />
          )}
        </div>
        <DialogFooter>
          {onDownload && (
            <Button variant="outline" disabled={loading || !!error} onClick={() => onDownload()}>
              <Download className="h-4 w-4 mr-1.5" />
              Télécharger
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
