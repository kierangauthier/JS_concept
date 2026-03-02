import { useState } from 'react';
import { useFilterByCompany, useApp } from '@/contexts/AppContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { CompanyBadge } from '@/components/shared/StatusBadge';
import { CompanySelect } from '@/components/shared/CompanySelect';
import { Client } from '@/types';
import { toast } from 'sonner';
import { useClients, useCreateClient, useUpdateClient } from '@/services/api/hooks';
import { CreateClientPayload } from '@/services/api/clients.api';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Users } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';

export default function Clients() {
  const { data: apiClients, isLoading, isError } = useClients();
  const allClients: Client[] = apiClients ?? [];
  const clients = useFilterByCompany(allClients);
  const { selectedCompany } = useApp();

  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();

  // Detail drawer
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formName, setFormName] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formType, setFormType] = useState<'public' | 'private'>('private');
  const [formCompany, setFormCompany] = useState<'ASP' | 'JS'>('ASP');

  function openCreateForm() {
    setEditingClient(null);
    setFormName('');
    setFormContact('');
    setFormEmail('');
    setFormPhone('');
    setFormAddress('');
    setFormCity('');
    setFormType('private');
    setFormOpen(true);
  }

  function openEditForm(c: Client) {
    setEditingClient(c);
    setFormName(c.name);
    setFormContact(c.contact);
    setFormEmail(c.email);
    setFormPhone(c.phone);
    setFormAddress(c.address);
    setFormCity(c.city);
    setFormType(c.type as 'public' | 'private');
    setFormOpen(true);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) { toast.error('Saisissez un nom'); return; }
    if (!formEmail.trim()) { toast.error('Saisissez un email'); return; }

    const payload: CreateClientPayload = {
      name: formName.trim(),
      contact: formContact.trim(),
      email: formEmail.trim(),
      phone: formPhone.trim(),
      address: formAddress.trim(),
      city: formCity.trim(),
      type: formType,
    };

    if (editingClient) {
      await updateMutation.mutateAsync({ id: editingClient.id, data: payload });
    } else {
      const scope = selectedCompany === 'GROUP' ? formCompany : undefined;
      await createMutation.mutateAsync({ data: payload, companyScope: scope });
    }
    setFormOpen(false);
    setEditingClient(null);
  }

  const columns: Column<Client>[] = [
    { key: 'name', header: 'Nom', sortable: true, accessor: (c) => c.name, render: (c) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">{c.name}</span>
        <CompanyBadge company={c.company} />
      </div>
    )},
    { key: 'contact', header: 'Contact', accessor: (c) => c.contact, render: (c) => <span>{c.contact}</span> },
    { key: 'city', header: 'Ville', sortable: true, accessor: (c) => c.city, render: (c) => <span>{c.city}</span> },
    { key: 'type', header: 'Type', render: (c) => (
      <span className={`text-xs font-medium ${c.type === 'public' ? 'text-info' : 'text-muted-foreground'}`}>
        {c.type === 'public' ? 'Public' : 'Privé'}
      </span>
    )},
    { key: 'phone', header: 'Téléphone', render: (c) => <span className="text-muted-foreground">{c.phone}</span> },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Clients" subtitle="Chargement…" action={{ label: 'Nouveau client', onClick: () => {} }} />
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Clients" subtitle={`${clients.length} clients`} action={{ label: 'Nouveau client', onClick: openCreateForm }} />
      {clients.length === 0 ? (
        <EmptyState icon={Users} title="Aucun client" description="Ajoutez votre premier client pour commencer." />
      ) : (
        <DataTable
          data={clients}
          columns={columns}
          searchPlaceholder="Rechercher un client…"
          searchAccessor={(c) => `${c.name} ${c.contact} ${c.city} ${c.email}`}
          onRowClick={(c) => setSelectedClient(c)}
        />
      )}

      {/* Client Detail Drawer */}
      <Sheet open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedClient && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <SheetTitle>{selectedClient.name}</SheetTitle>
                  <CompanyBadge company={selectedClient.company} />
                </div>
              </SheetHeader>

              <div className="flex gap-2 mb-4">
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => { openEditForm(selectedClient); setSelectedClient(null); }}>
                  <Pencil className="h-3 w-3" /> Modifier
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-xs text-muted-foreground uppercase">Contact</div><div className="font-medium">{selectedClient.contact}</div></div>
                <div><div className="text-xs text-muted-foreground uppercase">Email</div><div className="font-medium">{selectedClient.email}</div></div>
                <div><div className="text-xs text-muted-foreground uppercase">Téléphone</div><div className="font-medium">{selectedClient.phone}</div></div>
                <div><div className="text-xs text-muted-foreground uppercase">Type</div><div className="font-medium">{selectedClient.type === 'public' ? 'Public' : 'Privé'}</div></div>
                <div className="col-span-2"><div className="text-xs text-muted-foreground uppercase">Adresse</div><div className="font-medium">{selectedClient.address}, {selectedClient.city}</div></div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create / Edit Form Drawer */}
      <Sheet open={formOpen} onOpenChange={(open) => { if (!open) { setFormOpen(false); setEditingClient(null); } }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>{editingClient ? `Modifier ${editingClient.name}` : 'Nouveau client'}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {!editingClient && <CompanySelect value={formCompany} onChange={setFormCompany} />}
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Nom *</Label>
              <Input id="c-name" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Raison sociale" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-contact">Contact</Label>
              <Input id="c-contact" value={formContact} onChange={e => setFormContact(e.target.value)} placeholder="Nom du contact" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-email">Email *</Label>
              <Input id="c-email" type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-phone">Téléphone</Label>
              <Input id="c-phone" value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="01 23 45 67 89" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-address">Adresse</Label>
              <Input id="c-address" value={formAddress} onChange={e => setFormAddress(e.target.value)} placeholder="Rue, numéro" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-city">Ville</Label>
              <Input id="c-city" value={formCity} onChange={e => setFormCity(e.target.value)} placeholder="Ville" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-type">Type *</Label>
              <Select value={formType} onValueChange={(v: 'public' | 'private') => setFormType(v)}>
                <SelectTrigger id="c-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Privé</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? 'Enregistrement…' : editingClient ? 'Mettre à jour' : 'Créer le client'}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditingClient(null); }}>
                Annuler
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
