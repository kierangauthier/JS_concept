import { MessageSquare, Camera, FileText, Clock, CheckCircle2, AlertTriangle, ArrowRight, User } from 'lucide-react';

interface ActivityItem {
  id: string;
  user: string;
  action: string;
  detail?: string;
  timestamp: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  maxItems?: number;
}

const actionIcons: Record<string, React.ElementType> = {
  'créé': FileText,
  'validé': CheckCircle2,
  'envoyé': ArrowRight,
  'accepté': CheckCircle2,
  'Photo': Camera,
  'Heures': Clock,
  'Commentaire': MessageSquare,
  'Commande': FileText,
  'Réception': CheckCircle2,
  'Paiement': CheckCircle2,
  'retard': AlertTriangle,
};

function getIcon(action: string) {
  for (const [key, Icon] of Object.entries(actionIcons)) {
    if (action.includes(key)) return Icon;
  }
  return User;
}

export function ActivityFeed({ activities, maxItems = 10 }: ActivityFeedProps) {
  const items = activities.slice(0, maxItems);

  return (
    <div className="space-y-0">
      {items.map((item, idx) => {
        const Icon = getIcon(item.action);
        const isLast = idx === items.length - 1;
        return (
          <div key={item.id} className="flex gap-3 relative">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-[13px] top-7 bottom-0 w-px bg-border" />
            )}
            {/* Icon */}
            <div className="relative z-10 flex-shrink-0 h-7 w-7 rounded-full bg-muted flex items-center justify-center">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            {/* Content */}
            <div className="flex-1 pb-4 min-w-0">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-sm font-medium">{item.user}</span>
                <span className="text-sm text-muted-foreground">{item.action}</span>
              </div>
              {item.detail && (
                <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
              )}
              <time className="text-[10px] text-muted-foreground/60 mt-0.5 block">
                {new Date(item.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </time>
            </div>
          </div>
        );
      })}
      {activities.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">Aucune activité</p>
      )}
    </div>
  );
}
