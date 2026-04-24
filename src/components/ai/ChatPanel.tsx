import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAiChat } from '@/services/api/hooks';
import { ChatMessage, ChatSource } from '@/services/api/ai.api';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  Send, Loader2, Sparkles, FileText, Receipt, HardHat,
  Users, Paperclip, ShoppingCart, RotateCcw, ExternalLink,
} from 'lucide-react';

// ─── Suggestions rapides ──────────────────────────────────────────────────────

const QUICK_SUGGESTIONS = [
  'Quelles factures sont en retard ?',
  'Montre-moi les devis en attente de réponse',
  'Quels chantiers sont en cours ?',
  'Trouve les documents du dernier chantier',
];

// ─── Icône par type de source ─────────────────────────────────────────────────

function SourceIcon({ type }: { type: ChatSource['type'] }) {
  const cls = 'h-3 w-3';
  switch (type) {
    case 'quote':    return <FileText className={cls} />;
    case 'invoice':  return <Receipt className={cls} />;
    case 'job':      return <HardHat className={cls} />;
    case 'client':   return <Users className={cls} />;
    case 'document': return <Paperclip className={cls} />;
    case 'purchase': return <ShoppingCart className={cls} />;
  }
}

// ─── Bulle de message ─────────────────────────────────────────────────────────

function MessageBubble({ msg, onNavigate }: {
  msg: { role: 'user' | 'assistant'; content: string; sources?: ChatSource[] };
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const isUser = msg.role === 'user';

  // Formatter le markdown basique (gras, retours à la ligne)
  const formatted = msg.content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1">
            <div className="h-5 w-5 rounded-full bg-indigo-600 flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">Assistant IA</span>
          </div>
        )}

        <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-muted text-foreground rounded-tl-sm'
        }`}>
          <p dangerouslySetInnerHTML={{ __html: formatted }} />
        </div>

        {/* Sources */}
        {msg.sources && msg.sources.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {msg.sources.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  if (s.link && s.link.startsWith('/')) {
                    navigate(s.link);
                    onNavigate?.();
                  } else if (s.link) {
                    window.open(s.link, '_blank');
                  }
                }}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium
                  bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300
                  border border-indigo-200 dark:border-indigo-800 transition-colors"
              >
                <SourceIcon type={s.type} />
                {s.label.length > 30 ? s.label.slice(0, 30) + '…' : s.label}
                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Indicateur de frappe ─────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%]">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="h-5 w-5 rounded-full bg-indigo-600 flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
        </div>
        <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
          <div className="flex gap-1 items-center">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  onClose?: () => void;
  fullPage?: boolean;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ChatPanel({ onClose, fullPage = false }: ChatPanelProps) {
  const { currentUser } = useApp();
  const chatMutation = useAiChat();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string; sources?: ChatSource[] }>
  >([
    {
      role: 'assistant',
      content: `Bonjour ${currentUser?.name?.split(' ')[0] ?? ''} ! Je suis votre assistant ConceptManager. Je peux vous aider à **retrouver des documents**, **analyser vos données** (factures, devis, chantiers), vous **guider dans l'outil** ou **rédiger des textes** professionnels.\n\nQue puis-je faire pour vous ?`,
    },
  ]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatMutation.isPending]);

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || chatMutation.isPending) return;

    setInput('');

    const newMessages = [...messages, { role: 'user' as const, content: msg }];
    setMessages(newMessages);

    // Historique pour le contexte : sans le message d'accueil NI le message courant
    // (le message courant est envoyé séparément dans `message`, pas dans history)
    const history: ChatMessage[] = newMessages
      .slice(1, -1) // skip accueil + skip current user message
      .slice(-10)   // max 10 échanges précédents
      .map(m => ({ role: m.role, content: m.content }));

    const result = await chatMutation.mutateAsync({ message: msg, history });

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: result.message,
      sources: result.sources,
    }]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleReset() {
    setMessages([{
      role: 'assistant',
      content: `Conversation réinitialisée. Comment puis-je vous aider ?`,
    }]);
  }

  return (
    <div className={`flex flex-col bg-background ${fullPage ? 'h-full' : 'h-[520px]'}`}>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-1 space-y-0.5">
        {messages.map((m, i) => (
          <MessageBubble key={i} msg={m} onNavigate={onClose} />
        ))}
        {chatMutation.isPending && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions rapides — uniquement si pas encore de message utilisateur */}
      {messages.filter(m => m.role === 'user').length === 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {QUICK_SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSend(s)}
              className="text-[11px] px-2.5 py-1 rounded-full border border-indigo-200 text-indigo-700
                hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/40
                transition-colors bg-background"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Zone de saisie */}
      <div className="border-t px-3 py-2.5 bg-muted/30">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez votre question… (Entrée pour envoyer)"
            className="min-h-[40px] max-h-[120px] resize-none text-sm bg-background"
            rows={1}
            disabled={chatMutation.isPending}
          />
          <div className="flex flex-col gap-1">
            <Button
              size="sm"
              className="h-8 w-8 p-0 bg-indigo-600 hover:bg-indigo-700"
              onClick={() => handleSend()}
              disabled={!input.trim() || chatMutation.isPending}
            >
              {chatMutation.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Send className="h-3.5 w-3.5" />
              }
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={handleReset}
              title="Réinitialiser la conversation"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Shift+Entrée pour un saut de ligne
        </p>
      </div>
    </div>
  );
}
