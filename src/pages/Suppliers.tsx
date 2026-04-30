import { useState } from 'react';
import { useFilterByCompany, useApp } from '@/contexts/AppContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { CompanyBadge } from '@/components/shared/StatusBadge';
import { CompanySelect } from '@/components/shared/CompanySelect';
import { useSuppliers, useCreateSupplier, useUpdateSupplier } from '@/services/api/hooks';
import { Supplier } from '@/services/api/suppliers.api';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, Pencil } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { toast } from 'sonner';

export default function Suppliers() {
  const { data: apiSuppliers, isLoading } = useSuppliers();
  const suppliers = useFilterByCompany(apiSuppliers ?? []);
  const { selectedCompany } = useApp();

  const createMut = useCreateSupplier();
  const updateMut = useUpdateSupplier();

  const [editing, setEditing] = useState<Supplier | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formCompany, setFormCompany] = useState<'ASP' | 'JS'>(selectedCompany === 'JS' ? 'JS' : 'ASP');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('');

  function reset() {
    setName(''); setContact(''); setEmail(''); setPhone(''); setCategory('');
  }

  function openCreate() {
    setEditing(null);
    reset();
    setFormOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setName(s.name); setContact(s.contact); setEmail(s.email);
    setPhone(s.phone); setCategory(s.category);
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error('Saisissez un nom'); return; }
    const data = { name: name.trim(), contact: contact.trim(), email: email.trim(), phone: phone.trim(), category: category.trim() };
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, data });
      } else {
        const scope = selectedCompany === 'GROUP' ? formCompany : undefined;
        await createMut.mutateAsync({ data, companyScope: scope });
      }
      setFormOpen(false);
    } catch {
      // toast already shown by hook onError
    }
  }

  const columns: Column<Supplier>[] = [
    { key: 'name', header: 'Nom', sortable: true, accessor: (s) => s.name, render: (s) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">{s.name}</span>
        <CompanyBadge company={s.company} />
      </div>
    )},
    { key: 'category', header: 'Catégorie', sortable: true, accessor: (s) => s.category, render: (s) => <span className="text-xs text-muted-foreground">{s.category || '—'}</span> },
    { key: 'contact', header: 'Contact', render: (s) => <span className="text-sm">{s.contact}</span> },
    { key: 'email', header: 'Email', render: (s) => <span className="text-xs text-muted-foreground">{s.email}</span> },
    { key: 'phone', header: 'Téléphone', render: (s) => <span className="text-xs text-muted-foreground">{s.phone}</span> },
    { key: 'actions', header: '', render: (s) => (
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(s); }}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    )},
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Fournisseurs" subtitle="Chargement…" action={{ label: 'Nouveau fournisseur', onClick: () => {} }} />
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fournisseurs"
        subtitle={`${suppliers.length} fournisseur${suppliers.length > 1 ? 's' : ''}`}
        action={{ label: 'Nouveau fournisseur', onClick: openCreate }}
      >
        <CompanySelect />
      </PageHeader>

      {suppliers.length === 0 ? (
        <EmptyState icon={Truck} title="Aucun fournisseur" description="Créez votre premier fournisseur." />
      ) : (
        <DataTable
          data={suppliers}
          columns={columns}
          searchPlaceholder="Rechercher un fournisseur…"
          searchAccessor={(s) => `${s.name} ${s.contact} ${s.email} ${s.category}`}
        />
      )}

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {!editing && selectedCompany === 'GROUP' && (
              <CompanySelect value={formCompany} onChange={setFormCompany} />
            )}
            <div className="space-y-1.5">
              <Label htmlFor="s-name">Nom *</Label>
              <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="s-contact">Contact</Label>
                <Input id="s-contact" value={contact} onChange={(e) => setContact(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-category">Catégorie</Label>
                <Input id="s-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Matériaux, Location…" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="s-email">Email</Label>
                <Input id="s-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-phone">Téléphone</Label>
                <Input id="s-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {(createMut.isPending || updateMut.isPending) ? 'Enregistrement…' : editing ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
