import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { mockClients, mockQuotes, mockJobs, mockInvoices } from '@/services/mockData';
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
  const navigate = useNavigate();

  const results = useMemo<SearchResult[]>(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    const r: SearchResult[] = [];

    mockClients.filter(c => c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q))
      .slice(0, 5).forEach(c => r.push({ type: 'client', label: c.name, sub: c.city, path: '/clients' }));

    mockQuotes.filter(d => d.reference.toLowerCase().includes(q) || d.subject.toLowerCase().includes(q) || d.clientName.toLowerCase().includes(q))
      .slice(0, 5).forEach(d => r.push({ type: 'devis', label: d.reference, sub: d.subject, path: '/quotes' }));

    mockJobs.filter(j => j.reference.toLowerCase().includes(q) || j.title.toLowerCase().includes(q) || j.clientName.toLowerCase().includes(q))
      .slice(0, 5).forEach(j => r.push({ type: 'chantier', label: j.reference, sub: j.title, path: '/jobs' }));

    mockInvoices.filter(f => f.reference.toLowerCase().includes(q) || f.clientName.toLowerCase().includes(q))
      .slice(0, 5).forEach(f => r.push({ type: 'facture', label: f.reference, sub: f.clientName, path: '/invoicing' }));

    return r.slice(0, 12);
  }, [query]);

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
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher clients, devis, chantiers…"
          className="pl-9 pr-8 h-9 w-64 lg:w-80 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-ring"
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-full min-w-[360px] bg-card border rounded-lg shadow-lg z-50 max-h-80 overflow-auto animate-fade-in">
            {results.map((r, i) => (
              <button
                key={i}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                onClick={() => { navigate(r.path); setOpen(false); setQuery(''); }}
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
