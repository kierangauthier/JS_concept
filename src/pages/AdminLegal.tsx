import { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { CompanySelect } from '@/components/shared/CompanySelect';
import { useCompanyLegal, useUpdateCompanyLegal } from '@/services/api/hooks';
import { CompanyLegal, FacturxProfile, UpdateLegalPayload } from '@/services/api/legal.api';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, AlertCircle } from 'lucide-react';

const FACTURX_PROFILES: FacturxProfile[] = ['MINIMUM', 'BASIC', 'EN16931', 'EXTENDED'];

type FormState = Required<{ [K in keyof UpdateLegalPayload]: string }>;

const EMPTY: FormState = {
  legalName: '', tagline: '', legalForm: '', shareCapital: '', legalRepresentative: '',
  siren: '', siret: '', apeCode: '', vatNumber: '', rcsCity: '',
  addressLine1: '', addressLine2: '', postalCode: '', city: '', countryCode: 'FR',
  phone: '', email: '', website: '',
  iban: '', bic: '', bankName: '',
  paymentTerms: '', latePaymentRate: '', lateFeeFlat: '', discountRate: '',
  facturxProfile: 'BASIC',
};

function toForm(legal: CompanyLegal | null | undefined): FormState {
  if (!legal) return { ...EMPTY };
  const out: any = { ...EMPTY };
  for (const key of Object.keys(EMPTY) as (keyof FormState)[]) {
    const v = (legal as any)[key];
    out[key] = v == null ? '' : String(v);
  }
  return out;
}

function toPayload(form: FormState): UpdateLegalPayload {
  const out: any = {};
  const trim = (s: string) => s.trim();
  const nonEmpty = (s: string) => trim(s).length > 0;

  // String fields — null when blank so they wipe properly when cleared.
  const stringFields: (keyof FormState)[] = [
    'legalName', 'tagline', 'legalForm', 'legalRepresentative',
    'siren', 'siret', 'apeCode', 'vatNumber', 'rcsCity',
    'addressLine1', 'addressLine2', 'postalCode', 'city', 'countryCode',
    'phone', 'email', 'website',
    'iban', 'bic', 'bankName',
    'paymentTerms', 'latePaymentRate',
  ];
  for (const f of stringFields) {
    out[f] = nonEmpty(form[f]) ? trim(form[f]) : null;
  }

  // Number fields
  for (const f of ['shareCapital', 'lateFeeFlat', 'discountRate'] as const) {
    out[f] = nonEmpty(form[f]) ? Number(form[f]) : null;
  }

  // Enum
  out.facturxProfile = (form.facturxProfile as FacturxProfile) || 'BASIC';

  // Strip null fields the backend treats as "no change" (PATCH semantics).
  // Only send keys whose value is a non-empty string or a finite number.
  const payload: UpdateLegalPayload = {};
  for (const [k, v] of Object.entries(out)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'number' && !Number.isFinite(v)) continue;
    (payload as any)[k] = v;
  }
  return payload;
}

export default function AdminLegal() {
  const { selectedCompany, currentUser } = useApp();
  const isAdmin = currentUser?.role === 'admin';
  const isGroupScope = selectedCompany === 'GROUP';

  const { data: legal, isLoading } = useCompanyLegal();
  const updateMut = useUpdateCompanyLegal();
  const [form, setForm] = useState<FormState>({ ...EMPTY });

  useEffect(() => {
    if (legal) setForm(toForm(legal));
  }, [legal]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await updateMut.mutateAsync(toPayload(form));
  }

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <PageHeader title="Informations légales" />
        <div className="bg-card border rounded-lg p-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm">Cette page est réservée aux administrateurs.</p>
        </div>
      </div>
    );
  }

  if (isGroupScope) {
    return (
      <div className="space-y-4">
        <PageHeader title="Informations légales" subtitle="Identité, numéros officiels, conditions commerciales">
          <CompanySelect />
        </PageHeader>
        <div className="bg-card border rounded-lg p-6 flex items-start gap-3">
          <Building2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Sélectionnez une entité</p>
            <p className="text-xs text-muted-foreground">
              Les informations légales sont distinctes pour JS Concept et ASP Signalisation.
              Choisissez l'entité à modifier dans le sélecteur en haut à droite.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Informations légales" />
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Informations légales"
        subtitle={legal ? `Entité : ${legal.name}` : 'Identité, numéros officiels, conditions commerciales'}
      >
        <CompanySelect />
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Tabs defaultValue="identity">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="identity">Identité</TabsTrigger>
            <TabsTrigger value="official">Numéros officiels</TabsTrigger>
            <TabsTrigger value="address">Adresse</TabsTrigger>
            <TabsTrigger value="banking">Bancaire</TabsTrigger>
            <TabsTrigger value="commercial">Commercial</TabsTrigger>
          </TabsList>

          <TabsContent value="identity" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Raison sociale" id="legalName">
                <Input id="legalName" value={form.legalName} onChange={(e) => set('legalName', e.target.value)} placeholder="JS CONCEPT" />
              </Field>
              <Field label="Tagline (sous-titre PDF)" id="tagline">
                <Input id="tagline" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="Signalisation & Aménagement" />
              </Field>
              <Field label="Forme juridique" id="legalForm">
                <Input id="legalForm" value={form.legalForm} onChange={(e) => set('legalForm', e.target.value)} placeholder="SAS, SARL, SA…" />
              </Field>
              <Field label="Capital social (€)" id="shareCapital">
                <Input id="shareCapital" type="number" step="0.01" value={form.shareCapital} onChange={(e) => set('shareCapital', e.target.value)} placeholder="50000" />
              </Field>
              <Field label="Représentant légal" id="legalRepresentative" colSpan={2}>
                <Input id="legalRepresentative" value={form.legalRepresentative} onChange={(e) => set('legalRepresentative', e.target.value)} placeholder="Nom Prénom du dirigeant" />
              </Field>
            </div>
          </TabsContent>

          <TabsContent value="official" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="SIREN (9 chiffres)" id="siren">
                <Input id="siren" value={form.siren} onChange={(e) => set('siren', e.target.value)} placeholder="523456789" pattern="\d{9}" />
              </Field>
              <Field label="SIRET (14 chiffres)" id="siret">
                <Input id="siret" value={form.siret} onChange={(e) => set('siret', e.target.value)} placeholder="52345678900012" pattern="\d{14}" />
              </Field>
              <Field label="Code APE" id="apeCode">
                <Input id="apeCode" value={form.apeCode} onChange={(e) => set('apeCode', e.target.value)} placeholder="4399C" />
              </Field>
              <Field label="N° TVA intracommunautaire" id="vatNumber">
                <Input id="vatNumber" value={form.vatNumber} onChange={(e) => set('vatNumber', e.target.value)} placeholder="FR12523456789" />
              </Field>
              <Field label="Ville du RCS" id="rcsCity" colSpan={2}>
                <Input id="rcsCity" value={form.rcsCity} onChange={(e) => set('rcsCity', e.target.value)} placeholder="Saint-Étienne" />
              </Field>
            </div>
          </TabsContent>

          <TabsContent value="address" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Adresse ligne 1" id="addressLine1" colSpan={2}>
                <Input id="addressLine1" value={form.addressLine1} onChange={(e) => set('addressLine1', e.target.value)} placeholder="24 boulevard de l'Industrie" />
              </Field>
              <Field label="Adresse ligne 2" id="addressLine2" colSpan={2}>
                <Input id="addressLine2" value={form.addressLine2} onChange={(e) => set('addressLine2', e.target.value)} placeholder="Bâtiment B, ZI Sud" />
              </Field>
              <Field label="Code postal" id="postalCode">
                <Input id="postalCode" value={form.postalCode} onChange={(e) => set('postalCode', e.target.value)} placeholder="42000" />
              </Field>
              <Field label="Ville" id="city">
                <Input id="city" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Saint-Étienne" />
              </Field>
              <Field label="Pays (code ISO)" id="countryCode">
                <Input id="countryCode" value={form.countryCode} onChange={(e) => set('countryCode', e.target.value)} placeholder="FR" maxLength={2} />
              </Field>
              <Field label="Téléphone" id="phone">
                <Input id="phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="04 77 33 12 34" />
              </Field>
              <Field label="Email" id="email">
                <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="contact@js-concept.fr" />
              </Field>
              <Field label="Site web" id="website">
                <Input id="website" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="www.js-concept.fr" />
              </Field>
            </div>
          </TabsContent>

          <TabsContent value="banking" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="IBAN" id="iban" colSpan={2}>
                <Input id="iban" value={form.iban} onChange={(e) => set('iban', e.target.value)} placeholder="FR76 1234 5678 9012 3456 7890 123" />
              </Field>
              <Field label="BIC / SWIFT" id="bic">
                <Input id="bic" value={form.bic} onChange={(e) => set('bic', e.target.value)} placeholder="CMCIFRPP" />
              </Field>
              <Field label="Banque" id="bankName">
                <Input id="bankName" value={form.bankName} onChange={(e) => set('bankName', e.target.value)} placeholder="Crédit Mutuel" />
              </Field>
            </div>
          </TabsContent>

          <TabsContent value="commercial" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Conditions de paiement" id="paymentTerms" colSpan={2}>
                <Input id="paymentTerms" value={form.paymentTerms} onChange={(e) => set('paymentTerms', e.target.value)} placeholder="Paiement à 30 jours fin de mois" />
              </Field>
              <Field label="Taux pénalités de retard" id="latePaymentRate">
                <Input id="latePaymentRate" value={form.latePaymentRate} onChange={(e) => set('latePaymentRate', e.target.value)} placeholder="3 × taux d'intérêt légal" />
              </Field>
              <Field label="Indemnité forfaitaire (€)" id="lateFeeFlat">
                <Input id="lateFeeFlat" type="number" step="0.01" value={form.lateFeeFlat} onChange={(e) => set('lateFeeFlat', e.target.value)} placeholder="40" />
              </Field>
              <Field label="Taux d'escompte (%)" id="discountRate">
                <Input id="discountRate" type="number" step="0.01" value={form.discountRate} onChange={(e) => set('discountRate', e.target.value)} placeholder="0" />
              </Field>
              <Field label="Profil Factur-X" id="facturxProfile">
                <Select value={form.facturxProfile} onValueChange={(v) => set('facturxProfile', v as FacturxProfile)}>
                  <SelectTrigger id="facturxProfile"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FACTURX_PROFILES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="submit" disabled={updateMut.isPending}>
            {updateMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, id, children, colSpan }: { label: string; id: string; children: React.ReactNode; colSpan?: number }) {
  return (
    <div className={`space-y-1.5 ${colSpan === 2 ? 'col-span-2' : ''}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
