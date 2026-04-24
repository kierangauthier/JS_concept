import { useDailyBriefing } from '@/services/api/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Sparkles, AlertCircle, TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/contexts/AppContext';

const priorityConfig = {
  critical: { label: 'Urgent', className: 'bg-red-100 text-red-800 border-red-200' },
  high:     { label: 'Prioritaire', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  medium:   { label: 'À faire', className: 'bg-blue-100 text-blue-700 border-blue-200' },
};

export function AiBriefingWidget() {
  const { data, isLoading, isError } = useDailyBriefing();
  const queryClient = useQueryClient();
  const { selectedCompany } = useApp();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['daily-briefing', selectedCompany] });
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-semibold text-indigo-700">Analyse IA en cours…</span>
        </div>
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-16 w-full mb-2" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border bg-gray-50 p-4">
        <div className="flex items-center gap-2 text-gray-400">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Assistant IA indisponible</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-indigo-50 p-4 space-y-3">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-100 rounded-lg">
            <Sparkles className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-indigo-800">Assistant IA</p>
            <p className="text-xs text-indigo-500">
              {new Date(data.generatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-indigo-400 hover:text-indigo-600"
          onClick={refresh}
          title="Actualiser"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Résumé */}
      <div className="bg-white/60 rounded-lg px-3 py-2">
        <div className="flex items-start gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
          <p className="text-sm text-gray-700 leading-snug">{data.summary}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {data.actions.map((action, i) => {
          const cfg = priorityConfig[action.priority];
          return (
            <div key={i} className="bg-white/70 rounded-lg px-3 py-2 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-xs px-1.5 py-0 ${cfg.className}`}>
                  {cfg.label}
                </Badge>
                <span className="text-xs text-gray-400">{action.category}</span>
              </div>
              <p className="text-sm font-medium text-gray-800">{action.action}</p>
              <p className="text-xs text-gray-500 leading-snug">{action.detail}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
