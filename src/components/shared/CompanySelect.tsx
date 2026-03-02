import { useApp } from '@/contexts/AppContext';
import { Company } from '@/types';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CompanySelectProps {
  /** Controlled value. When omitted, binds to the global selectedCompany scope. */
  value?: string;
  /** Callback when the value changes. When omitted, updates the global selectedCompany scope. */
  onChange?: (value: 'ASP' | 'JS') => void;
}

/**
 * Company selector with two modes:
 * 1. Controlled (value + onChange) — used in create forms to pick the target entity.
 * 2. Uncontrolled — used in page headers; reads/writes the global selectedCompany scope.
 *
 * Always returns null when the current scope is already a specific company (not GROUP),
 * unless used in controlled mode where the parent manages its own local state.
 */
export function CompanySelect({ value, onChange }: CompanySelectProps) {
  const { selectedCompany, setSelectedCompany, currentUser } = useApp();

  // Hide entirely for technicien/comptable roles
  if (currentUser?.role === 'technicien' || currentUser?.role === 'comptable') return null;

  // Uncontrolled mode: only render as a scope switcher when on GROUP
  const isControlled = value !== undefined;
  if (!isControlled && selectedCompany !== 'GROUP') return null;

  const currentValue = isControlled ? value : selectedCompany;

  const handleChange = (val: string) => {
    const company = val as 'ASP' | 'JS';
    if (typeof onChange === 'function') {
      onChange(company);
    } else {
      setSelectedCompany(company);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor="company-select">Entité {isControlled ? '*' : ''}</Label>
      <Select value={currentValue} onValueChange={handleChange}>
        <SelectTrigger id="company-select">
          <SelectValue placeholder="Choisissez une entité" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ASP">ASP Signalisation</SelectItem>
          <SelectItem value="JS">JS Concept</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Hook that returns the effective company for a create operation.
 * If user is on GROUP, they must pick; otherwise returns selectedCompany.
 */
export function useCreateCompany() {
  const { selectedCompany } = useApp();
  const isGroup = selectedCompany === 'GROUP';
  return { isGroup, selectedCompany };
}
