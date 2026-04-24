import { ChatPanel } from '@/components/ai/ChatPanel';
import { Sparkles } from 'lucide-react';

export default function Assistant() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b bg-background">
        <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Assistant IA</h1>
          <p className="text-xs text-muted-foreground">
            Recherche documents · Analyse métier · Navigation · Rédaction
          </p>
        </div>
      </div>

      {/* Chat pleine page */}
      <div className="flex-1 overflow-hidden">
        <ChatPanel fullPage />
      </div>
    </div>
  );
}
