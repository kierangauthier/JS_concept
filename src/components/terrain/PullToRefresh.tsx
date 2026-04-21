import { ReactNode, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  /** Async refresh handler. The indicator stays visible until it resolves. */
  onRefresh: () => Promise<unknown>;
  /** Distance in pixels the user must pull before the refresh triggers on release. */
  threshold?: number;
  children: ReactNode;
}

/**
 * Lightweight pull-to-refresh for mobile terrain screens.
 *
 * - Only triggers when the scroll container is at the top (scrollTop === 0).
 * - Gesture is tracked via touch events; no third-party dep.
 * - Pointer events on desktop are intentionally ignored — use a refresh button instead.
 */
export function PullToRefresh({ onRefresh, threshold = 70, children }: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  function onTouchStart(e: React.TouchEvent) {
    if (refreshing) return;
    const scrollTop = containerRef.current?.scrollTop ?? window.scrollY;
    if (scrollTop > 0) {
      startY.current = null;
      return;
    }
    startY.current = e.touches[0].clientY;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startY.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) {
      setPullDistance(0);
      return;
    }
    // Apply a dampening factor so the rubber-band feels natural.
    setPullDistance(Math.min(delta * 0.5, threshold * 1.5));
  }

  async function onTouchEnd() {
    if (startY.current === null) return;
    startY.current = null;
    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }

  const showIndicator = pullDistance > 0 || refreshing;
  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="relative"
    >
      {showIndicator && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-10"
          style={{
            height: `${refreshing ? threshold : pullDistance}px`,
            transition: refreshing || pullDistance === 0 ? 'height 150ms ease' : undefined,
          }}
        >
          <RefreshCw
            className={`h-5 w-5 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`}
            style={{
              transform: refreshing ? undefined : `rotate(${progress * 270}deg)`,
              opacity: Math.max(0.3, progress),
            }}
          />
        </div>
      )}
      <div
        style={{
          transform: `translateY(${refreshing ? threshold : pullDistance}px)`,
          transition: refreshing || pullDistance === 0 ? 'transform 150ms ease' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
