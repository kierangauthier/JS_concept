# Notes développeur — Sprints QA/UX

Compléments aux patterns introduits dans les sprints 1 à 4. Conventions à respecter pour toute nouvelle page.

---

## Formulaires : garde-fous perte de saisie

### Quand l'utiliser

Dès qu'un formulaire dépasse 3-4 champs ou manipule des données couteuses à ressaisir (lignes de devis, fiche client, chantier).

### Pattern

```ts
import { useFormGuard } from '@/hooks/use-dirty-form';

const [formBaseline, setFormBaseline] = useState<unknown>(null);

const formValues = useMemo(
  () => ({ name, email, /* … */ }),
  [name, email /* … */],
);

const { guardClose: guardCloseForm } = useFormGuard(
  formValues,
  formOpen ? (formBaseline as typeof formValues | null) : null,
  formOpen,
);

const closeForm = () => {
  setFormOpen(false);
  setFormBaseline(null);
  // Reset local state too if the form owns it.
};

// Open handlers must seed `formBaseline` with the starting values.
function openCreateForm() {
  setName(''); setEmail('');
  setFormBaseline({ name: '', email: '' });
  setFormOpen(true);
}

// Attach the guard to the Sheet/Dialog close paths.
<Sheet open={formOpen} onOpenChange={(open) => { if (!open) guardCloseForm(closeForm); }}>
  …
  <Button onClick={() => guardCloseForm(closeForm)}>Annuler</Button>
</Sheet>
```

### Cas particulier : édition avec données async

Quand l'édition hydrate des lignes via un `useXxxDetail`, seedez `formBaseline` à `null` dans `openEditForm`, puis capturez le snapshot dans un `useEffect` quand les données sont chargées :

```ts
useEffect(() => {
  if (formOpen && editingEntity && formBaseline === null) {
    setFormBaseline(formValues);
  }
}, [formOpen, editingEntity, formBaseline, formValues]);
```

Voir [Quotes.tsx](../src/pages/Quotes.tsx) pour l'exemple complet.

---

## Confirmation d'action destructive

Utilisez `<ConfirmDialog variant="destructive">` pour toute suppression, annulation, ou action irréversible.

```tsx
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

const [toDelete, setToDelete] = useState<Thing | null>(null);
const deleteMutation = useDeleteThing();

<Button onClick={() => setToDelete(thing)}><Trash2/></Button>

<ConfirmDialog
  open={!!toDelete}
  onOpenChange={(o) => !o && setToDelete(null)}
  title="Supprimer cet élément ?"
  description={<>Vous êtes sur le point de supprimer <strong>{toDelete?.name}</strong>. Action irréversible.</>}
  confirmLabel="Supprimer"
  variant="destructive"
  loading={deleteMutation.isPending}
  onConfirm={async () => {
    if (!toDelete) return;
    await deleteMutation.mutateAsync(toDelete.id);
    setToDelete(null);
  }}
/>
```

Jamais `window.confirm()` — ni cohérent visuellement, ni contrôlable pour l'état `loading`.

---

## Filtres / tri / pagination dans l'URL

Utilisez `useUrlState` pour tout état qui mérite d'être partagé via un lien ou restauré après rafraîchissement.

```ts
import { useUrlState } from '@/hooks/use-url-state';

const [status, setStatus] = useUrlState('status', 'all');
```

La valeur par défaut est **supprimée** de l'URL (pas de `?status=all` résiduel).

Pour un nombre :

```ts
import { useUrlNumber } from '@/hooks/use-url-state';
const [page, setPage] = useUrlNumber('page', 1);
```

---

## Formatage (dates, devises, pluriels)

**Jamais de `toLocaleDateString('fr-FR', …)` ou `${count > 1 ? 's' : ''}` inline.**

```ts
import { fmt, plural } from '@/lib/format';

fmt.date(invoice.issuedAt)         // "21/04/2026"
fmt.dateTime(absence.createdAt)    // "21/04/2026 14:30"
fmt.currency(invoice.amount)       // "1 234,50 €"
fmt.percent(margin)                // "42 %"

plural(clients.length, 'client')   // "3 clients" / "1 client"
plural(3, 'cheval', 'chevaux')     // plural irrégulier
```

---

## Raccourcis clavier

```ts
import { useHotkeys } from '@/hooks/use-hotkeys';

useHotkeys([
  { key: 'ArrowLeft',  ctrl: true, handler: (e) => { e.preventDefault(); goPrev(); } },
  { key: 'Home',                     handler: () => goToday() },
]);
```

Par défaut, les raccourcis sont **ignorés lorsque le focus est dans un input/textarea/contenteditable**. Passez `allowInInput: true` pour forcer le fonctionnement dans les champs.

---

## Pull-to-refresh (terrain uniquement)

```tsx
import { PullToRefresh } from '@/components/terrain/PullToRefresh';
import { useQueryClient } from '@tanstack/react-query';

const qc = useQueryClient();
const handleRefresh = () => qc.invalidateQueries({ queryKey: ['my-planning'] });

return (
  <PullToRefresh onRefresh={handleRefresh}>
    {/* contenu */}
  </PullToRefresh>
);
```

- Gesture tactile uniquement (pas de trackpad).
- Seuil déclenchement : 70 px par défaut, ajustable via `threshold`.

---

## Audit trail

Tout rejet / approbation doit :

1. Exiger un motif (≥ 3 caractères) côté backend pour les rejets.
2. Stocker `rejectedByUserId` et `rejectionReason` dans la table correspondante.
3. Émettre un `auditService.log({ action: 'REJECT_XXX', ... })`.
4. Clear le trail au retour en statut non-rejeté (voir `time-entries.service.ts:transition`).

---

## Offline / dead-letter

- Toute mutation offline passe par `useOfflineMutation` (voir `src/services/offline/hooks.ts`).
- Après **3 échecs**, le `syncManager` marque la mutation `failed` et **cesse de la ressayer automatiquement**.
- L'utilisateur voit un toast d'alerte + une bannière dans `TerrainQueue`.
- Ne jamais supprimer silencieusement une mutation `failed` — offrir un bouton retry / delete explicite.

---

## Check-list PR

Avant d'ouvrir une PR :

```bash
npm run typecheck    # doit passer (0 erreur)
npm run lint         # warnings tolérés, pas d'erreurs
npm test             # tous les tests doivent passer
npm run build        # build prod doit sortir sans erreur
```

Le workflow `.github/workflows/ci.yml` exécute ces étapes automatiquement sur chaque PR.
