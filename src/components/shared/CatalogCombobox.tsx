import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useFilterByCompany } from '@/contexts/AppContext';
import { useCatalogProducts } from '@/services/api/hooks';
import { CatalogProduct } from '@/services/api/catalog.api';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface CatalogComboboxProps {
  value: string;
  onChange: (designation: string) => void;
  onPickProduct?: (product: CatalogProduct) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Designation field with catalog autocomplete.
 *
 * - Free typing always allowed (the user can build an ad-hoc line that does
 *   not exist in the catalog) — the bare Input controls `value`.
 * - Clicking the chevron opens the catalog list filtered by the typed text
 *   and the active company scope. Picking a product calls `onPickProduct`,
 *   which the parent uses to pre-fill unit / unitPrice / costPrice.
 */
export function CatalogCombobox({ value, onChange, onPickProduct, placeholder, className }: CatalogComboboxProps) {
  const [open, setOpen] = useState(false);
  const { data: apiProducts } = useCatalogProducts();
  const products = useFilterByCompany((apiProducts ?? []).filter(p => p.isActive));

  // Sort by category, then designation, for a stable browsing order.
  const sorted = useMemo(
    () => [...products].sort((a, b) => {
      const ca = a.categoryName ?? '';
      const cb = b.categoryName ?? '';
      if (ca !== cb) return ca.localeCompare(cb);
      return a.designation.localeCompare(b.designation);
    }),
    [products],
  );

  return (
    // min-w-0 + flex-1 on Input prevent the wrapper from claiming its content's
    // natural width inside a table cell — the chevron click was widening the
    // Désignation column (and the Sheet drawer with it) when long product
    // designations were already in `value`. The Popover itself renders in a
    // Radix Portal so it never affects parent layout directly.
    <div className={cn('flex items-center gap-1 min-w-0', className)}>
      <Input
        className="h-7 text-xs flex-1 min-w-0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Désignation (ou choix catalogue →)'}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            title="Choisir dans le catalogue"
          >
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(420px,calc(100vw-2rem))] p-0" align="end" collisionPadding={16}>
          <Command>
            <CommandInput placeholder="Rechercher dans le catalogue…" />
            <CommandList>
              <CommandEmpty>Aucun produit trouvé.</CommandEmpty>
              <CommandGroup>
                {sorted.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`${p.designation} ${p.reference} ${p.categoryName ?? ''}`}
                    onSelect={() => {
                      onChange(p.designation);
                      onPickProduct?.(p);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn('mr-2 h-3 w-3', value === p.designation ? 'opacity-100' : 'opacity-0')} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{p.designation}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {p.reference}{p.categoryName ? ` · ${p.categoryName}` : ''} · {p.salePrice.toLocaleString('fr-FR')} € / {p.unit}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
