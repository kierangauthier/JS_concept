import { ReactNode, isValidElement } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /**
   * Either a simple `{ label, onClick }` that renders a primary CTA, or an arbitrary
   * ReactNode for pages that need several buttons / custom toolbars.
   */
  action?: { label: string; onClick: () => void } | ReactNode;
  children?: ReactNode;
}

function isActionObject(value: unknown): value is { label: string; onClick: () => void } {
  return (
    typeof value === 'object' &&
    value !== null &&
    !isValidElement(value) &&
    'label' in value &&
    'onClick' in value
  );
}

export function PageHeader({ title, subtitle, action, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {isActionObject(action) ? (
          <Button onClick={action.onClick} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
            <Plus className="mr-1 h-4 w-4" />
            {action.label}
          </Button>
        ) : (
          action ?? null
        )}
      </div>
    </div>
  );
}
