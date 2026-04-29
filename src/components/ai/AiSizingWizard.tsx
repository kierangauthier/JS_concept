/**
 * AiSizingWizard — Wizard dimensionnement PAC → devis en un clic
 * WOW 1 : 6 champs → recommandation PAC + devis complet généré
 */

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, ThermometerSun, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '@/services/api';

interface SizingLine {
  reference: string;
  designation: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  vatRate: number;
}

interface SizingResult {
  recommendation: {
    gamme: string;
    puissancekW: number;
    referenceGroupe: string;
    referenceModule: string;
    justification: string;
    alternativeGroupe?: string;
    zoneClimatique: string;
    temperatureBase: number;
    deperditionsEstimees: number;
  };
  quoteLines: SizingLine[];
  quoteSubject: string;
  estimatedTotal: number;
  maPrimeRenovEstimate?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (subject: string, lines: SizingLine[]) => void;
}

const EMETTEURS = [
  { value: 'radiateurs_fonte',  label: 'Radiateurs fonte / acier (ancien)' },
  { value: 'radiateurs_acier',  label: 'Radiateurs acier / aluminium (récent)' },
  { value: 'radiateurs_alu',    label: 'Radiateurs aluminium basse T°' },
  { value: 'plancher_chauffant',label: 'Plancher chauffant' },
  { value: 'ventilo_convecteurs',label: 'Ventilo-convecteurs' },
  { value: 'mixte',             label: 'Mixte (plusieurs types)' },
];

const CHAUFFAGE_EXISTANT = [
  { value: 'fioul',      label: 'Chaudière fioul' },
  { value: 'gaz',        label: 'Chaudière gaz' },
  { value: 'electrique', label: 'Chauffage électrique (convecteurs / PAC)' },
  { value: 'autre',      label: 'Autre / aucun' },
];

const GAMME_COLORS: Record<string, string> = {
  'Standard': 'bg-green-100 text-green-800',
  'Premium': 'bg-blue-100 text-blue-800',
};

export default function AiSizingWizard({ open, onClose, onApply }: Props) {
  const [step, setStep] = useState<'form' | 'result'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SizingResult | null>(null);

  const [form, setForm] = useState({
    surface: '',
    anneeConstruction: '',
    departement: '',
    typeEmetteurs: '',
    chauffageExistant: '',
    typeProjet: 'renovation',
    ecsIntegree: 'oui',
    nombrePersonnes: '3',
    observations: '',
  });

  function setField(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.surface || !form.anneeConstruction || !form.departement || !form.typeEmetteurs || !form.chauffageExistant) {
      setError('Merci de remplir tous les champs obligatoires.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<SizingResult>('/ai/size-and-quote', {
        surface: Number(form.surface),
        anneeConstruction: Number(form.anneeConstruction),
        departement: form.departement,
        typeEmetteurs: form.typeEmetteurs,
        chauffageExistant: form.chauffageExistant,
        typeProjet: form.typeProjet,
        ecsIntegree: form.ecsIntegree,
        nombrePersonnes: Number(form.nombrePersonnes),
        observations: form.observations || undefined,
      });
      setResult(res.data);
      setStep('result');
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors du dimensionnement');
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (!result) return;
    onApply(result.quoteSubject, result.quoteLines);
    onClose();
    setStep('form');
    setResult(null);
  }

  function handleClose() {
    onClose();
    setStep('form');
    setResult(null);
    setError(null);
  }

  const gammeColor = result ? (GAMME_COLORS[result.recommendation.gamme] ?? 'bg-gray-100 text-gray-800') : '';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-orange-500" />
            Dimensionnement automatique PAC
          </DialogTitle>
        </DialogHeader>

        {step === 'form' && (
          <>
            <div className="grid grid-cols-2 gap-4 py-2">
              {/* Surface */}
              <div className="space-y-1">
                <Label htmlFor="surface">Surface habitable (m²) *</Label>
                <Input id="surface" type="number" placeholder="ex: 140" value={form.surface}
                  onChange={e => setField('surface', e.target.value)} />
              </div>
              {/* Année */}
              <div className="space-y-1">
                <Label htmlFor="annee">Année de construction *</Label>
                <Input id="annee" type="number" placeholder="ex: 1985" value={form.anneeConstruction}
                  onChange={e => setField('anneeConstruction', e.target.value)} />
              </div>
              {/* Département */}
              <div className="space-y-1">
                <Label htmlFor="dept">Département (2 chiffres) *</Label>
                <Input id="dept" type="text" maxLength={3} placeholder="ex: 78" value={form.departement}
                  onChange={e => setField('departement', e.target.value)} />
              </div>
              {/* Nb personnes */}
              <div className="space-y-1">
                <Label htmlFor="pers">Nombre de personnes</Label>
                <Input id="pers" type="number" placeholder="3" value={form.nombrePersonnes}
                  onChange={e => setField('nombrePersonnes', e.target.value)} />
              </div>
              {/* Émetteurs */}
              <div className="space-y-1 col-span-2">
                <Label>Type d'émetteurs *</Label>
                <Select value={form.typeEmetteurs} onValueChange={v => setField('typeEmetteurs', v)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {EMETTEURS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Chauffage existant */}
              <div className="space-y-1">
                <Label>Chauffage existant *</Label>
                <Select value={form.chauffageExistant} onValueChange={v => setField('chauffageExistant', v)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {CHAUFFAGE_EXISTANT.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Type projet */}
              <div className="space-y-1">
                <Label>Type de projet</Label>
                <Select value={form.typeProjet} onValueChange={v => setField('typeProjet', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="renovation">Rénovation</SelectItem>
                    <SelectItem value="neuf">Maison neuve</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* ECS */}
              <div className="space-y-1">
                <Label>ECS via PAC</Label>
                <Select value={form.ecsIntegree} onValueChange={v => setField('ecsIntegree', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oui">Oui (module Duo)</SelectItem>
                    <SelectItem value="non">Non (ECS séparée)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Observations */}
              <div className="space-y-1 col-span-2">
                <Label htmlFor="obs">Observations (optionnel)</Label>
                <Textarea id="obs" placeholder="Ex: maison mal isolée, radiateurs fonte 2 zones, relève chaudière gaz..."
                  rows={2} value={form.observations}
                  onChange={e => setField('observations', e.target.value)} />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded p-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Annuler</Button>
              <Button onClick={handleSubmit} disabled={loading} className="gap-2">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Calcul en cours...</> : <><Zap className="h-4 w-4" /> Dimensionner et générer le devis</>}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'result' && result && (
          <>
            {/* Recommandation */}
            <div className="rounded-lg border bg-orange-50 border-orange-200 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ThermometerSun className="h-5 w-5 text-orange-500 shrink-0" />
                  <div>
                    <div className="font-semibold text-base">
                      {result.recommendation.gamme} {result.recommendation.puissancekW} kW
                    </div>
                    <div className="text-sm font-mono text-gray-600">
                      {result.recommendation.referenceGroupe} + {result.recommendation.referenceModule}
                    </div>
                  </div>
                </div>
                <Badge className={gammeColor}>{result.recommendation.gamme}</Badge>
              </div>
              <p className="text-sm text-gray-700">{result.recommendation.justification}</p>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                <div>Zone {result.recommendation.zoneClimatique} · T°base {result.recommendation.temperatureBase}°C</div>
                <div>Déperditions ~{result.recommendation.deperditionsEstimees} W/m²</div>
                {result.maPrimeRenovEstimate && (
                  <div className="text-green-600 font-medium">🏦 {result.maPrimeRenovEstimate}</div>
                )}
              </div>
            </div>

            {/* Lignes de devis */}
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Lignes générées ({result.quoteLines.length}) · Total estimé :{' '}
                <span className="font-semibold">
                  {result.estimatedTotal.toLocaleString('fr-FR')} € HT
                </span>
              </div>
              <div className="rounded border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Désignation</th>
                      <th className="px-2 py-2 text-right">Qté</th>
                      <th className="px-2 py-2 text-right">PU HT</th>
                      <th className="px-2 py-2 text-right">Total HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.quoteLines.map((l, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-1.5">
                          <div>{l.designation}</div>
                          {l.reference && <div className="font-mono text-gray-400">{l.reference}</div>}
                        </td>
                        <td className="px-2 py-1.5 text-right">{l.quantity} {l.unit}</td>
                        <td className="px-2 py-1.5 text-right">{l.unitPrice.toLocaleString('fr-FR')} €</td>
                        <td className="px-2 py-1.5 text-right font-medium">
                          {(l.quantity * l.unitPrice).toLocaleString('fr-FR')} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep('form')}>← Modifier</Button>
              <Button onClick={handleApply} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Insérer dans le devis
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
