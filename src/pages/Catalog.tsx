import { useState, useRef } from 'react';
import { useFilterByCompany, useApp } from '@/contexts/AppContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { CompanyBadge } from '@/components/shared/StatusBadge';
import { CompanySelect } from '@/components/shared/CompanySelect';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Package, Plus, Upload, Pencil, Trash2, FolderPlus } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { plural } from '@/lib/format';
import {
  useCatalogProducts,
  useCatalogCategories,
  useCreateCatalogProduct,
  useUpdateCatalogProduct,
  useDeleteCatalogProduct,
  useCreateCatalogCategory,
  useImportCatalogCsv,
} from '@/services/api/hooks';
import { CatalogProduct } from '@/services/api/catalog.api';

export default function Catalog() {
  const { selectedCompany } = useApp();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const { data: categories = [] } = useCatalogCategories();
  const { data: apiProducts, isLoading } = useCatalogProducts(undefined, categoryFilter === 'all' ? undefined : categoryFilter);
  const products = useFilterByCompany(apiProducts ?? []);

  const createMutation = useCreateCatalogProduct();
  const updateMutation = useUpdateCatalogProduct();
  const deleteMutation = useDeleteCatalogProduct();
  const createCategoryMutation = useCreateCatalogCategory();
  const importMutation = useImportCatalogCsv();

  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<CatalogProduct | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [productToDelete, setProductToDelete] = useState<CatalogProduct | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formCompany, setFormCompany] = useState<'ASP' | 'JS'>(selectedCompany === 'JS' ? 'JS' : 'ASP');
  const [formRef, setFormRef] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formUnit, setFormUnit] = useState('m²');
  const [formSalePrice, setFormSalePrice] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');

  function openCreateForm() {
    setEditProduct(null);
    setFormRef('');
    setFormDesignation('');
    setFormUnit('m²');
    setFormSalePrice('');
    setFormCostPrice('');
    setFormCategoryId('');
    setFormOpen(true);
  }

  function openEditForm(p: CatalogProduct) {
    setEditProduct(p);
    setFormRef(p.reference);
    setFormDesignation(p.designation);
    setFormUnit(p.unit);
    setFormSalePrice(String(p.salePrice));
    setFormCostPrice(String(p.costPrice));
    setFormCategoryId(p.categoryId ?? '');
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const salePrice = parseFloat(formSalePrice);
    const costPrice = parseFloat(formCostPrice) || 0;
    if (!formRef.trim() || !formDesignation.trim() || isNaN(salePrice)) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const data = {
      reference: formRef.trim(),
      designation: formDesignation.trim(),
      unit: formUnit.trim(),
      salePrice,
      costPrice,
      categoryId: formCategoryId || undefined,
    };

    if (editProduct) {
      await updateMutation.mutateAsync({ id: editProduct.id, data });
    } else {
      const scope = selectedCompany === 'GROUP' ? formCompany : undefined;
      await createMutation.mutateAsync(data);
    }
    setFormOpen(false);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    importMutation.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    await createCategoryMutation.mutateAsync({ name: newCategoryName.trim() });
    setNewCategoryName('');
    setCategoryFormOpen(false);
  }

  const columns: Column<CatalogProduct>[] = [
    {
      key: 'reference',
      header: 'Réf.',
      sortable: true,
      accessor: (p) => p.reference,
      render: (p) => (
        <div className="flex items-center gap-2">
          <span className="font-medium font-mono text-xs">{p.reference}</span>
          <CompanyBadge company={p.company} />
        </div>
      ),
    },
    { key: 'designation', header: 'Désignation', sortable: true, accessor: (p) => p.designation, render: (p) => <span className="text-sm">{p.designation}</span> },
    { key: 'unit', header: 'Unité', render: (p) => <span className="text-xs text-muted-foreground">{p.unit}</span> },
    { key: 'category', header: 'Catégorie', render: (p) => <span className="text-xs">{p.categoryName || '–'}</span> },
    {
      key: 'salePrice',
      header: 'Prix vente',
      sortable: true,
      accessor: (p) => p.salePrice,
      render: (p) => <span className="font-medium">{p.salePrice.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>,
    },
    {
      key: 'costPrice',
      header: 'Prix revient',
      sortable: true,
      accessor: (p) => p.costPrice,
      render: (p) => <span className="text-muted-foreground">{p.costPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>,
    },
    {
      key: 'margin',
      header: 'Marge',
      render: (p) => {
        const margin = p.salePrice > 0 ? ((p.salePrice - p.costPrice) / p.salePrice * 100) : 0;
        return (
          <span className={`text-xs font-medium ${margin < 15 ? 'text-destructive' : margin < 30 ? 'text-warning-foreground' : 'text-success'}`}>
            {margin.toFixed(0)}%
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); openEditForm(p); }}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); setProductToDelete(p); }}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Catalogue" subtitle="Produits et prestations" />
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catalogue"
        subtitle={plural(products.length, 'produit')}
        action={
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setCategoryFormOpen(true)}>
              <FolderPlus className="h-3.5 w-3.5" /> Catégorie
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending}>
              <Upload className="h-3.5 w-3.5" /> {importMutation.isPending ? 'Import…' : 'Import CSV'}
            </Button>
            <Button size="sm" className="gap-1.5 text-xs" onClick={openCreateForm}>
              <Plus className="h-3.5 w-3.5" /> Nouveau produit
            </Button>
          </div>
        }
      />

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            categoryFilter === 'all' ? 'bg-secondary text-secondary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          Tous ({products.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              categoryFilter === cat.id ? 'bg-secondary text-secondary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            {cat.name} ({cat.productCount})
          </button>
        ))}
      </div>

      {products.length === 0 ? (
        <EmptyState icon={Package} title="Aucun produit" description="Ajoutez votre premier produit au catalogue ou importez un fichier CSV." />
      ) : (
        <DataTable
          data={products}
          columns={columns}
          searchPlaceholder="Rechercher un produit…"
          searchAccessor={(p) => `${p.reference} ${p.designation} ${p.categoryName || ''}`}
          onRowClick={(p) => setSelectedProduct(p)}
        />
      )}

      {/* Create/Edit Form Drawer */}
      <Sheet open={formOpen} onOpenChange={(open) => !open && setFormOpen(false)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>{editProduct ? 'Modifier le produit' : 'Nouveau produit'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editProduct && <CompanySelect value={formCompany} onChange={setFormCompany} />}
            <div className="space-y-1.5">
              <Label htmlFor="cat-ref">Référence *</Label>
              <Input id="cat-ref" value={formRef} onChange={(e) => setFormRef(e.target.value)} placeholder="D21a" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-designation">Désignation *</Label>
              <Input id="cat-designation" value={formDesignation} onChange={(e) => setFormDesignation(e.target.value)} placeholder="Panneau D21a type 1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cat-unit">Unité</Label>
                <Select value={formUnit} onValueChange={setFormUnit}>
                  <SelectTrigger id="cat-unit"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['u', 'm', 'm²', 'ml', 'kg', 'h', 'j', 'forfait'].map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-category">Catégorie</Label>
                <Select value={formCategoryId || '__none__'} onValueChange={(v) => setFormCategoryId(v === '__none__' ? '' : v)}>
                  <SelectTrigger id="cat-category"><SelectValue placeholder="Aucune" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucune</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cat-sale">Prix vente HT *</Label>
                <Input id="cat-sale" type="number" min="0" step="0.01" value={formSalePrice} onChange={(e) => setFormSalePrice(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-cost">Prix de revient</Label>
                <Input id="cat-cost" type="number" min="0" step="0.01" value={formCostPrice} onChange={(e) => setFormCostPrice(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? 'Enregistrement…' : editProduct ? 'Mettre à jour' : 'Créer le produit'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Category creation dialog */}
      <Sheet open={categoryFormOpen} onOpenChange={(open) => !open && setCategoryFormOpen(false)}>
        <SheetContent className="w-full sm:max-w-sm">
          <SheetHeader className="pb-4">
            <SheetTitle>Nouvelle catégorie</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Nom *</Label>
              <Input id="cat-name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Panneaux" />
            </div>
            <Button type="submit" className="w-full" disabled={createCategoryMutation.isPending}>
              {createCategoryMutation.isPending ? 'Création…' : 'Créer'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete product confirmation */}
      <ConfirmDialog
        open={!!productToDelete}
        onOpenChange={(open) => !open && setProductToDelete(null)}
        title="Supprimer ce produit ?"
        description={
          productToDelete ? (
            <>
              Vous êtes sur le point de supprimer <strong>{productToDelete.designation}</strong>
              {productToDelete.reference ? <> (<code>{productToDelete.reference}</code>)</> : null}. Cette action est irréversible.
            </>
          ) : null
        }
        confirmLabel="Supprimer"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!productToDelete) return;
          await deleteMutation.mutateAsync(productToDelete.id);
          setProductToDelete(null);
        }}
      />
    </div>
  );
}
