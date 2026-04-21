import { describe, it, expect } from 'vitest';

/**
 * Replicates the client-side overlap guard from Planning.tsx so the rule
 * can be regression-tested independently of the UI.
 *
 * Two slots overlap when their [startHour, endHour) intervals intersect on
 * the same team and same date. Touching ends (e.g. 9-12 and 12-14) are NOT
 * an overlap.
 */
interface Slot {
  id: string;
  teamId: string;
  date: string;
  startHour: number;
  endHour: number;
}

function hasOverlap(
  slots: Slot[],
  teamId: string,
  dateStr: string,
  startHour: number,
  endHour: number,
  excludeSlotId?: string,
): boolean {
  return slots.some(
    (s) =>
      s.teamId === teamId &&
      s.date === dateStr &&
      s.id !== excludeSlotId &&
      startHour < s.endHour &&
      endHour > s.startHour,
  );
}

const base: Slot = { id: 'a', teamId: 'T1', date: '2026-04-21', startHour: 9, endHour: 12 };

describe('hasOverlap (Planning client guard)', () => {
  it('flags a clearly overlapping interval', () => {
    expect(hasOverlap([base], 'T1', '2026-04-21', 11, 14)).toBe(true);
  });

  it('flags an interval that is fully contained', () => {
    expect(hasOverlap([base], 'T1', '2026-04-21', 10, 11)).toBe(true);
  });

  it('allows touching ends (end == other start)', () => {
    expect(hasOverlap([base], 'T1', '2026-04-21', 12, 14)).toBe(false);
    expect(hasOverlap([base], 'T1', '2026-04-21', 6, 9)).toBe(false);
  });

  it('ignores slots of a different team', () => {
    expect(hasOverlap([base], 'T2', '2026-04-21', 10, 11)).toBe(false);
  });

  it('ignores slots of a different day', () => {
    expect(hasOverlap([base], 'T1', '2026-04-22', 10, 11)).toBe(false);
  });

  it('excludes the slot itself when re-checking after a move', () => {
    expect(hasOverlap([base], 'T1', '2026-04-21', 10, 11, 'a')).toBe(false);
  });
});
