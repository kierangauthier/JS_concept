import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFilterByCompany, useApp } from '@/contexts/AppContext';
import { useFormGuard } from '@/hooks/use-dirty-form';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { CompanyBadge } from '@/components/shared/StatusBadge';
import { CompanySelect } from '@/components/shared/CompanySelect';
import { Client } from '@/types';
import { useClients, useCreateClient, useUpdateClient, useArchiveClient } from '@/services/api/hooks';
import { CreateClientPayload } from '@/services/api/clients.api';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Pencil, Users, Archive } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { clientSchema, ClientFormValues } from '@/lib/schemas';

export default function Clients() {
  const { data: apiClients, isLoading, isError } = useClients();
  const allClients: Client[] = apiClients ?? [];
  const clients = useFilterByCompany(allClients);
  const { selectedCompany } = useApp();

  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const archiveMutation = useArchiveClient();
  const [clientToArchive, setClientToArchive] = useState<Client | null>(null);

  // Detail drawer
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Form state — validation handled by zod via react-hook-form.
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formCompany, setFormCompany] = useState<'ASP' | 'JS'>(selectedCompany === 'JS' ? 'JS' : 'ASP');
  const [formBaseline, setFormBaseline] = useState<ClientFormValues | null>(null);

  const EMPTY_VALUES: ClientFormValues = {
    name: '', contact: '', email: '', phone: '', address: '', city: '', type: 'private',
  };

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: EMPTY_VALUES,
    mode: 'onBlur',
  });

  const formValuesForGuard = form.watch();
  const { guardClose: guardCloseForm } = useFormGuard(
    formValuesForGuard,
    formOpen ? formBaseline : null,
    formOpen,
  );

  const closeForm = () => {
    setFormOpen(false);
    setEditingClient(null);
    setFormBaseline(null);
    form.reset(EMPTY_VALUES);
  };

  function openCreateForm() {
    setEditingClient(null);
    form.reset(EMPTY_VALUES);
    setFormBaseline(EMPTY_VALUES);
    setFormOpen(true);
  }

  function openEditForm(c: Client) {
    setEditingClient(c);
    const values: ClientFormValues = {
      name: c.name,
      contact: c.contact ?? '',
      email: c.email,
      phone: c.phone ?? '',
      address: c.address ?? '',
      city: c.city ?? '',
      type: (c.type as 'public' | 'private') ?? 'private',
    };
    form.reset(values);
    setFormBaseline(values);
    setFormOpen(true);
  }

  async function onValid(values: ClientFormValues) {
    const payload: CreateClientPayload = {
      name: values.name,
      contact: values.contact ?? '',
      email: values.email,
      phone: values.phone ?? '',
      address: values.address ?? '',
      city: values.city ?? '',
      type: values.type,
    };

    if (editingClient) {
      await updateMutation.mutateAsync({ id: editingClient.id, data: payload });
    } else {
      const scope = selectedCompany === 'GROUP' ? formCompany : undefined;
      await createMutation.mutateAsync({ data: payload, companyScope: scope });
    }
    closeForm();
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
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setClientToArchive(selectedClient)}
                >
                  <Archive className="h-3 w-3" /> Archiver
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
      <Sheet open={formOpen} onOpenChange={(open) => { if (!open) guardCloseForm(closeForm); }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>{editingClient ? `Modifier ${editingClient.name}` : 'Nouveau client'}</SheetTitle>
          </SheetHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onValid)} className="space-y-4" noValidate>
              {!editingClient && <CompanySelect value={formCompany} onChange={setFormCompany} />}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Nom <span aria-hidden="true" className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Raison sociale" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom du contact" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Email <span aria-hidden="true" className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input placeholder="01 23 45 67 89" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse</FormLabel>
                    <FormControl>
                      <Input placeholder="Rue, numéro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville</FormLabel>
                    <FormControl>
                      <Input placeholder="Ville" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Type <span aria-hidden="true" className="text-destructive">*</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="private">Privé</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending)
                    ? 'Enregistrement…'
                    : editingClient ? 'Mettre à jour' : 'Créer le client'}
                </Button>
                <Button type="button" variant="outline" onClick={() => guardCloseForm(closeForm)}>
                  Annuler
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Archive confirmation */}
      <ConfirmDialog
        open={!!clientToArchive}
        onOpenChange={(open) => !open && setClientToArchive(null)}
        title="Archiver ce client ?"
        description={
          clientToArchive ? (
            <>
              <strong>{clientToArchive.name}</strong> n'apparaîtra plus dans la liste. Ses devis, factures et chantiers existants ne seront pas supprimés.
            </>
          ) : null
        }
        confirmLabel="Archiver"
        variant="destructive"
        loading={archiveMutation.isPending}
        onConfirm={async () => {
          if (!clientToArchive) return;
          await archiveMutation.mutateAsync(clientToArchive.id);
          setClientToArchive(null);
          setSelectedClient(null);
        }}
      />
    </div>
  );
}
