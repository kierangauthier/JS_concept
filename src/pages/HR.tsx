import { useState, useMemo, useRef } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { CompanySelect } from '@/components/shared/CompanySelect';
import { useApp } from '@/contexts/AppContext';
import { useTeams } from '@/services/api/hooks';
import {
  useHrDocs, useHrDocPresign, useHrDocCreate, useHrDocDownload, useHrDocDelete, useUserActivity, useCertificationMatrix,
} from '@/services/api/hooks';
import { Team, TeamMemberInfo } from '@/services/api/teams.api';
import { HrDocument } from '@/services/api/hr.api';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  UserCog, Upload, Download, Trash2, AlertTriangle, FileText, Calendar, History, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────────────────

interface TechnicianRow {
  userId: string;
  userName: string;
  userEmail: string;
  teamName: string | null;
  teamId: string | null;
  roleInTeam: string | null;
  company: string;
}

const DOC_TYPES = [
  { value: 'cni', label: "Carte d'identité" },
  { value: 'permis', label: 'Permis de conduire' },
  { value: 'habilitation_electrique', label: 'Habilitation électrique' },
  { value: 'caces', label: 'CACES' },
  { value: 'aptitude_medicale', label: 'Aptitude médicale' },
  { value: 'attestation_securite', label: 'Attestation sécurité' },
  { value: 'autre', label: 'Autre' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR');
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function HR() {
  const { selectedCompany, currentUser } = useApp();
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const [selectedTech, setSelectedTech] = useState<TechnicianRow | null>(null);

  // Build technician rows from teams data
  const technicians = useMemo<TechnicianRow[]>(() => {
    if (!teams) return [];
    const rows: TechnicianRow[] = [];
    const seen = new Set<string>();
    teams.forEach((team: Team) => {
      team.members.forEach((m: TeamMemberInfo) => {
        if (seen.has(m.userId)) return;
        seen.add(m.userId);
        rows.push({
          userId: m.userId,
          userName: m.userName,
          userEmail: m.userEmail,
          teamName: team.name,
          teamId: team.id,
          roleInTeam: m.roleInTeam,
          company: team.company,
        });
      });
    });
    return rows.sort((a, b) => a.userName.localeCompare(b.userName));
  }, [teams]);

  // Filter by company for GROUP view
  const filtered = useMemo(() => {
    if (selectedCompany === 'GROUP') return technicians;
    return technicians.filter(t => t.company === selectedCompany);
  }, [technicians, selectedCompany]);

  if (teamsLoading) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Gestion Techniciens" subtitle="Documents, planning et historique">
          <CompanySelect />
        </PageHeader>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Gestion Techniciens" subtitle="Documents, planning et historique">
        <CompanySelect />
      </PageHeader>

      {/* Technicians Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Équipe</TableHead>
              <TableHead>Rôle</TableHead>
              {selectedCompany === 'GROUP' && <TableHead>Entité</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={selectedCompany === 'GROUP' ? 5 : 4} className="text-center text-muted-foreground py-8">
                  Aucun technicien trouvé
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(tech => (
                <TableRow
                  key={tech.userId}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedTech(tech)}
                >
                  <TableCell className="font-medium">{tech.userName}</TableCell>
                  <TableCell className="text-muted-foreground">{tech.userEmail}</TableCell>
                  <TableCell>
                    {tech.teamName ? (
                      <Badge variant="outline">{tech.teamName}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">Non assigné</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {tech.roleInTeam ? (
                      <Badge variant="secondary">{tech.roleInTeam}</Badge>
                    ) : '—'}
                  </TableCell>
                  {selectedCompany === 'GROUP' && (
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{tech.company}</Badge>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Certification Matrix */}
      <CertificationMatrixSection />

      {/* Detail Sheet */}
      <Sheet open={!!selectedTech} onOpenChange={(open) => { if (!open) setSelectedTech(null); }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedTech && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  {selectedTech.userName}
                </SheetTitle>
                <div className="text-sm text-muted-foreground">
                  {selectedTech.userEmail}
                  {selectedTech.teamName && <> — Équipe {selectedTech.teamName}</>}
                </div>
              </SheetHeader>

              <Tabs defaultValue="documents" className="mt-6">
                <TabsList className="w-full">
                  <TabsTrigger value="documents" className="flex-1 gap-1">
                    <FileText className="h-3.5 w-3.5" /> Documents
                  </TabsTrigger>
                  <TabsTrigger value="planning" className="flex-1 gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Planning
                  </TabsTrigger>
                  <TabsTrigger value="historique" className="flex-1 gap-1">
                    <History className="h-3.5 w-3.5" /> Historique
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="documents" className="mt-4">
                  <DocumentsTab userId={selectedTech.userId} />
                </TabsContent>

                <TabsContent value="planning" className="mt-4">
                  <PlanningTab userId={selectedTech.userId} />
                </TabsContent>

                <TabsContent value="historique" className="mt-4">
                  <ActivityTab userId={selectedTech.userId} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Documents Tab ─────────────────────────────────────────────────────────

function DocumentsTab({ userId }: { userId: string }) {
  const { data: docs, isLoading } = useHrDocs(userId);
  const presignMutation = useHrDocPresign();
  const createMutation = useHrDocCreate();
  const downloadMutation = useHrDocDownload();
  const deleteMutation = useHrDocDelete();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState('cni');
  const [uploadLabel, setUploadLabel] = useState('');
  const [uploadPurpose, setUploadPurpose] = useState('');
  const [uploadExpiresAt, setUploadExpiresAt] = useState('');
  const [uploadRetentionUntil, setUploadRetentionUntil] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const expiredCount = docs?.filter(d => isExpired(d.expiresAt)).length ?? 0;

  async function handleUpload() {
    if (!selectedFile || !uploadLabel || !uploadPurpose) {
      toast.error('Remplissez tous les champs obligatoires');
      return;
    }

    setUploading(true);
    try {
      // 1. Get presigned URL
      const { uploadUrl, storageKey } = await presignMutation.mutateAsync({
        userId,
        type: uploadType,
        filename: selectedFile.name,
        contentType: selectedFile.type,
      });

      // 2. Upload directly to MinIO
      await fetch(uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: { 'Content-Type': selectedFile.type },
      });

      // 3. Create metadata in DB
      await createMutation.mutateAsync({
        userId,
        type: uploadType,
        label: uploadLabel,
        storageKey,
        mimeType: selectedFile.type,
        sizeBytes: selectedFile.size,
        purpose: uploadPurpose,
        expiresAt: uploadExpiresAt || undefined,
        retentionUntil: uploadRetentionUntil || undefined,
      });

      // Reset form
      setUploadOpen(false);
      setSelectedFile(null);
      setUploadLabel('');
      setUploadPurpose('');
      setUploadExpiresAt('');
      setUploadRetentionUntil('');
      setUploadType('cni');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      // Errors handled by mutation hooks
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(docId: string) {
    try {
      const { downloadUrl } = await downloadMutation.mutateAsync(docId);
      window.open(downloadUrl, '_blank');
    } catch {
      // Error handled by hook
    }
  }

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header + Upload button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{docs?.length ?? 0} document(s)</span>
          {expiredCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> {expiredCount} expiré(s)
            </Badge>
          )}
        </div>
        <Button size="sm" onClick={() => setUploadOpen(!uploadOpen)}>
          <Upload className="mr-1 h-4 w-4" /> Ajouter
        </Button>
      </div>

      {/* Upload form */}
      {uploadOpen && (
        <div className="rounded-md border p-4 space-y-3 bg-muted/30">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type *</Label>
              <Select value={uploadType} onValueChange={setUploadType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Libellé *</Label>
              <Input value={uploadLabel} onChange={e => setUploadLabel(e.target.value)} placeholder="Ex: Permis B" />
            </div>
          </div>
          <div>
            <Label>Justification (RGPD) *</Label>
            <Input value={uploadPurpose} onChange={e => setUploadPurpose(e.target.value)} placeholder="Ex: Vérification habilitation électrique" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Expiration document</Label>
              <Input type="date" value={uploadExpiresAt} onChange={e => setUploadExpiresAt(e.target.value)} />
            </div>
            <div>
              <Label>Conservation jusqu'au</Label>
              <Input type="date" value={uploadRetentionUntil} onChange={e => setUploadRetentionUntil(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Fichier *</Label>
            <Input
              ref={fileInputRef}
              type="file"
              onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setUploadOpen(false)}>Annuler</Button>
            <Button size="sm" onClick={handleUpload} disabled={uploading}>
              {uploading ? 'Envoi…' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      )}

      {/* Documents list */}
      {docs && docs.length > 0 ? (
        <div className="space-y-2">
          {docs.map((doc: HrDocument) => (
            <div key={doc.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{doc.label}</span>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {DOC_TYPES.find(t => t.value === doc.type)?.label ?? doc.type}
                  </Badge>
                  {isExpired(doc.expiresAt) && (
                    <Badge variant="destructive" className="text-xs shrink-0">Expiré</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {doc.expiresAt ? `Expire : ${formatDate(doc.expiresAt)}` : 'Pas d\'expiration'}
                  {' — '}Ajouté le {formatDate(doc.createdAt)}
                  {' — '}{(doc.sizeBytes / 1024).toFixed(0)} Ko
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc.id)}>
                  <Download className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer le document ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Le document « {doc.label} » sera définitivement supprimé. Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => deleteMutation.mutate(doc.id)}
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-6 text-sm">
          Aucun document enregistré
        </div>
      )}
    </div>
  );
}

// ─── Planning Tab ──────────────────────────────────────────────────────────

function PlanningTab({ userId }: { userId: string }) {
  const monday = getMonday(new Date());
  const weekStart = toISODate(monday);
  const weekEnd = toISODate(new Date(monday.getTime() + 4 * 86400000));

  const { data: activity, isLoading } = useUserActivity(userId, weekStart, weekEnd);

  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday.getTime() + i * 86400000);
    return {
      date: toISODate(d),
      label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
    };
  });

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  }

  const planned = activity?.planned ?? [];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Semaine du {formatDate(weekStart)}</h3>
      <div className="space-y-1">
        {days.map(day => {
          const daySlots = planned
            .filter(s => s.date.startsWith(day.date))
            .sort((a: any, b: any) => a.startHour - b.startHour);
          return (
            <div key={day.date} className="flex items-center gap-3 rounded-md border px-3 py-2">
              <span className="text-xs font-medium w-24 shrink-0">{day.label}</span>
              <div className="flex-1 flex flex-wrap gap-1">
                {daySlots.length > 0 ? daySlots.map((s: any, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {s.startHour}h-{s.endHour}h {s.jobRef}
                  </Badge>
                )) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {planned.length === 0 && (
        <p className="text-center text-muted-foreground text-xs py-2">Aucun créneau planifié cette semaine</p>
      )}
    </div>
  );
}

// ─── Activity / History Tab ────────────────────────────────────────────────

function ActivityTab({ userId }: { userId: string }) {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toISODate(d);
  });
  const [toDate, setToDate] = useState(() => toISODate(new Date()));
  const { data: activity, isLoading } = useUserActivity(userId, fromDate, toDate);

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  }

  const planned = activity?.planned ?? [];
  const actual = activity?.actual ?? [];

  return (
    <div className="space-y-4">
      {/* Date filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Label className="text-xs">Du</Label>
          <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div className="flex-1">
          <Label className="text-xs">Au</Label>
          <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
      </div>

      {/* Planned section */}
      <div>
        <h4 className="text-sm font-medium mb-2">Planifié ({planned.length})</h4>
        {planned.length > 0 ? (
          <div className="space-y-1">
            {planned.map((p, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs">
                <span className="font-medium w-20 shrink-0">{formatDate(p.date)}</span>
                <Badge variant="outline" className="text-xs">{p.startHour}h-{p.endHour}h</Badge>
                <span className="font-medium">{p.jobRef}</span>
                <span className="text-muted-foreground truncate">{p.jobTitle}</span>
                {p.teamName && <Badge variant="secondary" className="text-xs ml-auto shrink-0">{p.teamName}</Badge>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Aucun créneau planifié sur cette période</p>
        )}
      </div>

      {/* Actual section */}
      <div>
        <h4 className="text-sm font-medium mb-2">Réalisé ({actual.length})</h4>
        {actual.length > 0 ? (
          <div className="space-y-1">
            {actual.map((a, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs">
                <span className="font-medium w-20 shrink-0">{formatDate(a.date)}</span>
                <span className="font-medium">{a.hours}h</span>
                <span className="font-medium">{a.jobRef}</span>
                <span className="text-muted-foreground truncate">{a.jobTitle}</span>
                <Badge
                  variant={a.status === 'approved' ? 'default' : a.status === 'submitted' ? 'secondary' : 'outline'}
                  className="text-xs ml-auto shrink-0"
                >
                  {a.status}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Aucune saisie d'heures sur cette période</p>
        )}
      </div>
    </div>
  );
}

// ─── Certification Matrix Section ─────────────────────────────────────────

function CertificationMatrixSection() {
  const { data, isLoading } = useCertificationMatrix();
  const [expanded, setExpanded] = useState(false);

  if (isLoading || !data || data.types.length === 0) return null;

  const { types, matrix } = data;
  const statusIcon = (s: 'ok' | 'expired' | 'missing') =>
    s === 'ok' ? '✓' : s === 'expired' ? '⚠' : '—';
  const statusClass = (s: 'ok' | 'expired' | 'missing') =>
    s === 'ok' ? 'text-success bg-success/10' :
    s === 'expired' ? 'text-warning bg-warning/10' :
    'text-muted-foreground bg-muted';

  return (
    <div className="bg-card rounded-lg border">
      <button
        className="w-full px-4 py-3 flex items-center justify-between text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Matrice habilitations</span>
          <Badge variant="outline" className="text-xs">{matrix.length} collaborateurs × {types.length} types</Badge>
        </div>
        <span className="text-xs text-muted-foreground">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-medium sticky left-0 bg-card z-10">Collaborateur</TableHead>
                {types.map(t => (
                  <TableHead key={t} className="text-xs font-medium text-center whitespace-nowrap px-2">{t}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrix.map(row => (
                <TableRow key={row.userId}>
                  <TableCell className="text-xs font-medium sticky left-0 bg-card z-10">{row.userName}</TableCell>
                  {types.map(t => {
                    const status = row.certifications[t] ?? 'missing';
                    return (
                      <TableCell key={t} className="text-center px-2">
                        <span className={`inline-flex items-center justify-center h-6 w-6 rounded text-xs font-bold ${statusClass(status)}`}>
                          {statusIcon(status)}
                        </span>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
