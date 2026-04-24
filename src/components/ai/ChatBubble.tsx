import { useState } from 'react';
import { ChatPanel } from './ChatPanel';
import { Sparkles, X, Maximize2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAiStatus } from '@/services/api/hooks';

export function ChatBubble() {
  const [open, setOpen] = useState(false);
  const { data: status } = useAiStatus();
  const navigate = useNavigate();

  // Ne pas afficher si l'IA n'est pas configurée
  if (!status?.configured) return null;

  return (
    <>
      {/* Panel flottant */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-[360px] rounded-2xl shadow-2xl border bg-background overflow-hidden
          animate-in slide-in-from-bottom-4 fade-in duration-200">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="font-semibold text-sm">Assistant IA</span>
              <span className="text-[10px] bg-white/20 rounded-full px-1.5 py-0.5">ConceptManager</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { navigate('/assistant'); setOpen(false); }}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                title="Ouvrir en plein écran"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Chat */}
          <ChatPanel onClose={() => setOpen(false)} />
        </div>
      )}

      {/* Bouton flottant */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg
          flex items-center justify-center transition-all duration-200
          ${open
            ? 'bg-muted text-muted-foreground rotate-0 scale-95'
            : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-110'
          }`}
        title="Assistant IA"
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>
    </>
  );
}
