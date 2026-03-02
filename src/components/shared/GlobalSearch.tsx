import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSearch } from '@/services/api/hooks';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  type: 'client' | 'devis' | 'chantier' | 'facture';
  label: string;
  sub: string;
  path: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { data: searchResults, isLoading } = useSearch(debouncedQuery);

  // Transform API results into flat list
  const results: SearchResult[] = [];
  if (searchResults) {
    searchResults.clients.forEach(c =>
      results.push({ type: 'client', label: c.name, sub: c.city || c.email, path: '/clients' }),
    );
    searchResults.quotes.forEach(q =>
      results.push({ type: 'devis', label: q.reference, sub: q.subject, path: '/quotes' }),
    );
    searchResults.jobs.forEach(j =>
      results.push({ type: 'chantier', label: j.reference, sub: j.title, path: '/jobs' }),
    );
    searchResults.invoices.forEach(i =>
      results.push({ type: 'facture', label: i.reference, sub: `${i.amount.toLocaleString('fr-FR')} EUR`, path: '/invoicing' }),
    );
  }

  const hasResults = results.length > 0;
  const showDropdown = open && debouncedQuery.length >= 2;

  const typeLabels: Record<string, string> = {
    client: 'Client',
    devis: 'Devis',
    chantier: 'Chantier',
    facture: 'Facture',
  };

  const typeColors: Record<string, string> = {
    client: 'bg-info/15 text-info',
    devis: 'bg-primary/15 text-primary-foreground',
    chantier: 'bg-success/15 text-success',
    facture: 'bg-warning/15 text-warning-foreground',
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher clients, devis, chantiers..."
          className="pl-9 pr-8 h-9 w-64 lg:w-80 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-ring"
        />
        {query && (
          <button onClick={() => { setQuery(''); setDebouncedQuery(''); setOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-full min-w-[360px] bg-card border rounded-lg shadow-lg z-50 max-h-80 overflow-auto animate-fade-in">
            {isLoading && (
              <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Recherche...
              </div>
            )}
            {!isLoading && !hasResults && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Aucun resultat
              </div>
            )}
            {!isLoading && hasResults && results.map((r, i) => (
              <button
                key={i}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                onClick={() => { navigate(r.path); setOpen(false); setQuery(''); setDebouncedQuery(''); }}
              >
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${typeColors[r.type]}`}>
                  {typeLabels[r.type]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{r.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{r.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
