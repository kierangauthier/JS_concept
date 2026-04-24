import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { AdminSubnav } from '@/components/shared/AdminSubnav';
import { Skeleton } from '@/components/ui/skeleton';
import { useUsers, useClients, useJobs, useQuotes, useInvoices, usePurchases, useCreateUser, useUpdateUser, useDeleteUser, useResetPassword, useReminderRules, useCreateReminderRule, useUpdateReminderRule, useDeleteReminderRule, useRunReminders } from '@/services/api/hooks';
import { useFilterByCompany, useApp } from '@/contexts/AppContext';
import { Users, Building2, FileText, HardHat, Receipt, ShoppingCart, AlertTriangle, Plus, Pencil, Trash2, KeyRound, Bell, Play } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

const roleLabels: Record<string, string> = {
  admin: 'Admin / Gérant',
  conducteur: 'Conducteur de travaux',
  technicien: 'Technicien terrain',
  comptable: 'Comptable',
};

const roles = ['admin', 'conducteur', 'technicien', 'comptable'];

// We need company IDs for the create form
const COMPANIES: { code: string; label: string }[] = [
  { code: 'ASP', label: 'ASP Signalisation' },
  { code: 'JS', label: 'JS Concept' },
];

export default function AdminPage() {
  const { data: apiUsers, isLoading: loadingUsers, isError: errorUsers } = useUsers();
  const { data: apiClients, isLoading: loadingClients, isError: errorClients } = useClients();
  const { data: apiJobs, isLoading: loadingJobs } = useJobs();
  const { data: apiQuotes, isLoading: loadingQuotes } = useQuotes();
  const { data: apiInvoices, isLoading: loadingInvoices } = useInvoices();
  const { data: apiPurchases, isLoading: loadingPurchases } = usePurchases();

  const users = apiUsers ?? [];
  const clients = useFilterByCompany(apiClients ?? []);
  const jobs = useFilterByCompany(apiJobs ?? []);
  const quotes = useFilterByCompany(apiQuotes ?? []);
  const invoices = useFilterByCompany(apiInvoices ?? []);
  const purchases = useFilterByCompany(apiPurchases ?? []);

  const isLoading = loadingUsers || loadingClients || loadingJobs || loadingQuotes || loadingInvoices || loadingPurchases;
  const hasError = errorUsers || errorClients;

  // User form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('technicien');
  const [formCompanyCode, setFormCompanyCode] = useState('ASP');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  // Password reset
  const [resetTarget, setResetTarget] = useState<any | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  // Mutations
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();
  const resetMutation = useResetPassword();

  // Reminder rules
  const { data: reminderRules = [] } = useReminderRules();
  const createRuleMutation = useCreateReminderRule();
  const updateRuleMutation = useUpdateReminderRule();
  const deleteRuleMutation = useDeleteReminderRule();
  const runRemindersMutation = useRunReminders();
  const [ruleFormOpen, setRuleFormOpen] = useState(false);
  const [ruleLevel, setRuleLevel] = useState('1');
  const [ruleDelay, setRuleDelay] = useState('7');
  const [ruleSubject, setRuleSubject] = useState('Relance facture {{reference}}');
  const [ruleBody, setRuleBody] = useState('<p>Bonjour {{clientName}},</p><p>Nous vous rappelons que la facture {{reference}} d\'un montant de {{amount}} € est arrivée à échéance le {{dueDate}}.</p><p>Merci de procéder au règlement dans les meilleurs délais.</p>');

  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    await createRuleMutation.mutateAsync({
      level: parseInt(ruleLevel),
      delayDays: parseInt(ruleDelay),
      subject: ruleSubject,
      bodyTemplate: ruleBody,
    });
    setRuleFormOpen(false);
  }

  function openCreateForm() {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('technicien');
    setFormCompanyCode('ASP');
    setFormOpen(true);
  }

  function openEditForm(u: any) {
    setEditingUser(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormPassword('');
    setFormRole(u.role);
    setFormCompanyCode(u.company);
    setFormOpen(true);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) { toast.error('Saisissez un nom'); return; }
    if (!formEmail.trim()) { toast.error('Saisissez un email'); return; }

    if (editingUser) {
      await updateMutation.mutateAsync({
        id: editingUser.id,
        data: {
          name: formName.trim(),
          email: formEmail.trim(),
          role: formRole,
        },
      });
    } else {
      if (!formPassword || formPassword.length < 6) { toast.error('Mot de passe : 6 caractères minimum'); return; }
      // The backend accepts either the company code (ASP/JS) or a cuid as companyId
      // and resolves it server-side (see users.controller.ts → create).
      await createMutation.mutateAsync({
        name: formName.trim(),
        email: formEmail.trim(),
        password: formPassword,
        role: formRole,
        companyId: formCompanyCode,
      });
    }
    setFormOpen(false);
    setEditingUser(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  async function handleResetPassword() {
    if (!resetTarget) return;
    if (!resetPassword || resetPassword.length < 6) {
      toast.error('Mot de passe : 6 caractères minimum');
      return;
    }
    await resetMutation.mutateAsync({ id: resetTarget.id, password: resetPassword });
    setResetTarget(null);
    setResetPassword('');
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <AdminSubnav />
        <PageHeader title="Administration" subtitle="Chargement..." />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="space-y-6">
        <AdminSubnav />
        <PageHeader title="Administration" subtitle="Paramètres et gestion" />
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div>
            <div className="text-sm font-medium text-destructive">Erreur de chargement</div>
            <div className="text-xs text-muted-foreground">Impossible de charger les données. Vérifiez la connexion API.</div>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Utilisateurs', value: users.length, icon: Users },
    { label: 'Clients', value: clients.length, icon: Building2 },
    { label: 'Chantiers', value: jobs.length, icon: HardHat },
    { label: 'Devis', value: quotes.length, icon: FileText },
    { label: 'Factures', value: invoices.length, icon: Receipt },
    { label: 'Achats', value: purchases.length, icon: ShoppingCart },
  ];

  return (
    <div className="space-y-6">
      <AdminSubnav />
      <PageHeader title="Administration" subtitle="Paramètres et gestion" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</span>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Users list */}
      <div className="bg-card rounded-lg border">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold">Utilisateurs ({users.length})</h2>
          <Button size="sm" className="text-xs gap-1" onClick={openCreateForm}>
            <Plus className="h-3 w-3" /> Nouvel utilisateur
          </Button>
        </div>
        <div className="divide-y">
          {users.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun utilisateur trouvé.</div>
          ) : (
            users.map(u => (
              <div key={u.id} className="px-4 py-3 flex items-center gap-4 table-row-hover">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-xs font-bold text-secondary-foreground">
                    {u.name.split(' ').map((n: string) => n[0]).join('')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
                <span className="text-xs font-medium text-muted-foreground hidden sm:block">{roleLabels[u.role] ?? u.role}</span>
                <span className="text-xs font-bold uppercase px-1.5 py-0.5 rounded bg-muted">{u.company}</span>
                {!u.isActive && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">Inactif</span>
                )}
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditForm(u)} title="Modifier">
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setResetTarget(u); setResetPassword(''); }} title="Réinitialiser le mot de passe">
                    <KeyRound className="h-3 w-3" />
                  </Button>
                  {u.isActive && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(u)} title="Désactiver">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Clients list */}
      <div className="bg-card rounded-lg border">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Clients ({clients.length})</h2>
        </div>
        <div className="divide-y">
          {clients.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun client trouvé.</div>
          ) : (
            clients.map(c => (
              <div key={c.id} className="px-4 py-3 flex items-center gap-4 table-row-hover">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.contact} · {c.email}</div>
                </div>
                <span className="text-xs text-muted-foreground">{c.type === 'public' ? 'Public' : 'Privé'}</span>
                <span className="text-xs font-bold uppercase px-1.5 py-0.5 rounded bg-muted">{c.company}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reminder Rules */}
      <div className="bg-card rounded-lg border">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Règles de relance ({reminderRules.length})</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1"
              disabled={runRemindersMutation.isPending}
              onClick={() => runRemindersMutation.mutate()}
            >
              <Play className="h-3 w-3" />
              {runRemindersMutation.isPending ? 'Traitement...' : 'Lancer les relances'}
            </Button>
            <Button size="sm" className="text-xs gap-1" onClick={() => setRuleFormOpen(true)}>
              <Plus className="h-3 w-3" /> Nouvelle règle
            </Button>
          </div>
        </div>

        {ruleFormOpen && (
          <form onSubmit={handleCreateRule} className="p-4 border-b bg-muted/30 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Niveau</Label>
                <Input type="number" min="1" max="5" value={ruleLevel} onChange={e => setRuleLevel(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Délai (jours après échéance)</Label>
                <Input type="number" min="1" value={ruleDelay} onChange={e => setRuleDelay(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Objet de l'email</Label>
              <Input value={ruleSubject} onChange={e => setRuleSubject(e.target.value)} placeholder="Relance facture {{reference}}" />
            </div>
            <div className="space-y-1.5">
              <Label>Corps du message (HTML)</Label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={ruleBody}
                onChange={e => setRuleBody(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Variables : {'{{reference}}'}, {'{{amount}}'}, {'{{dueDate}}'}, {'{{clientName}}'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="text-xs" disabled={createRuleMutation.isPending}>
                {createRuleMutation.isPending ? 'Création...' : 'Créer'}
              </Button>
              <Button type="button" size="sm" variant="outline" className="text-xs" onClick={() => setRuleFormOpen(false)}>
                Annuler
              </Button>
            </div>
          </form>
        )}

        <div className="divide-y">
          {reminderRules.length === 0 && !ruleFormOpen ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Aucune règle configurée. Créez des règles pour automatiser les relances clients.
            </div>
          ) : (
            reminderRules.map(rule => (
              <div key={rule.id} className="px-4 py-3 flex items-center gap-4 table-row-hover">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-xs font-bold text-secondary-foreground">R{rule.level}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{rule.subject}</div>
                  <div className="text-xs text-muted-foreground">J+{rule.delayDays} après échéance</div>
                </div>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  rule.isActive ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
                }`}>
                  {rule.isActive ? 'Active' : 'Inactive'}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateRuleMutation.mutate({ id: rule.id, data: { isActive: !rule.isActive } })}
                    title={rule.isActive ? 'Désactiver' : 'Activer'}
                  >
                    <Bell className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => deleteRuleMutation.mutate(rule.id)}
                    title="Supprimer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create / Edit User Sheet */}
      <Sheet open={formOpen} onOpenChange={(open) => { if (!open) { setFormOpen(false); setEditingUser(null); } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>{editingUser ? `Modifier ${editingUser.name}` : 'Nouvel utilisateur'}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="u-name">Nom *</Label>
              <Input id="u-name" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Jean Dupont" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="u-email">Email *</Label>
              <Input id="u-email" type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="jean@example.com" />
            </div>

            {!editingUser && (
              <div className="space-y-1.5">
                <Label htmlFor="u-password">Mot de passe *</Label>
                <Input id="u-password" type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder="6 caractères minimum" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="u-role">Rôle *</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger id="u-role"><SelectValue placeholder="Rôle" /></SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!editingUser && (
              <div className="space-y-1.5">
                <Label htmlFor="u-company">Entité *</Label>
                <Select value={formCompanyCode} onValueChange={setFormCompanyCode}>
                  <SelectTrigger id="u-company"><SelectValue placeholder="Entité" /></SelectTrigger>
                  <SelectContent>
                    {COMPANIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) ? 'Enregistrement...' : editingUser ? 'Mettre à jour' : 'Créer'}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditingUser(null); }}>
                Annuler
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Désactiver l'utilisateur</DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment désactiver <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email}) ?
              L'utilisateur ne pourra plus se connecter.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={handleDelete}>
              {deleteMutation.isPending ? 'Désactivation...' : 'Désactiver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) { setResetTarget(null); setResetPassword(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
            <DialogDescription>
              Nouveau mot de passe pour <strong>{resetTarget?.name}</strong> ({resetTarget?.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reset-pw">Nouveau mot de passe</Label>
            <Input
              id="reset-pw"
              type="password"
              value={resetPassword}
              onChange={e => setResetPassword(e.target.value)}
              placeholder="6 caractères minimum"
              className="mt-1.5"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetTarget(null); setResetPassword(''); }}>Annuler</Button>
            <Button disabled={resetMutation.isPending} onClick={handleResetPassword}>
              {resetMutation.isPending ? 'Réinitialisation...' : 'Réinitialiser'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
