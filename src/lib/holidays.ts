/**
 * French public holidays (jours fériés) for the years the app currently spans.
 *
 * Hardcoded for 2025 / 2026 / 2027 — this is enough for the demo and for the
 * 12-month historical seed window. Easter-derived holidays (Pâques, Ascension,
 * Pentecôte) are computed values, so they're inlined per year rather than
 * pulled from a runtime library.
 *
 * If the app needs to extend further in time, prefer adding a year by hand
 * over importing a library: the rules are stable, the surface is tiny, and
 * shipping a date library + its TZ data costs more than ~30 lines.
 */

const HOLIDAYS: Record<string, string> = {
  // ─── 2025 ────────────────────────────────────────────────────────────
  '2025-01-01': "Jour de l'an",
  '2025-04-21': 'Lundi de Pâques',
  '2025-05-01': 'Fête du Travail',
  '2025-05-08': 'Victoire 1945',
  '2025-05-29': 'Ascension',
  '2025-06-09': 'Lundi de Pentecôte',
  '2025-07-14': 'Fête nationale',
  '2025-08-15': 'Assomption',
  '2025-11-01': 'Toussaint',
  '2025-11-11': 'Armistice',
  '2025-12-25': 'Noël',

  // ─── 2026 ────────────────────────────────────────────────────────────
  '2026-01-01': "Jour de l'an",
  '2026-04-06': 'Lundi de Pâques',
  '2026-05-01': 'Fête du Travail',
  '2026-05-08': 'Victoire 1945',
  '2026-05-14': 'Ascension',
  '2026-05-25': 'Lundi de Pentecôte',
  '2026-07-14': 'Fête nationale',
  '2026-08-15': 'Assomption',
  '2026-11-01': 'Toussaint',
  '2026-11-11': 'Armistice',
  '2026-12-25': 'Noël',

  // ─── 2027 ────────────────────────────────────────────────────────────
  '2027-01-01': "Jour de l'an",
  '2027-03-29': 'Lundi de Pâques',
  '2027-05-01': 'Fête du Travail',
  '2027-05-06': 'Ascension',
  '2027-05-08': 'Victoire 1945',
  '2027-05-17': 'Lundi de Pentecôte',
  '2027-07-14': 'Fête nationale',
  '2027-08-15': 'Assomption',
  '2027-11-01': 'Toussaint',
  '2027-11-11': 'Armistice',
  '2027-12-25': 'Noël',
};

function toLocalISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Returns the holiday name for a given date, or null if it's a working day. */
export function getHolidayName(date: Date): string | null {
  return HOLIDAYS[toLocalISO(date)] ?? null;
}

/** Convenience: true when the date is a French public holiday. */
export function isHoliday(date: Date): boolean {
  return Boolean(HOLIDAYS[toLocalISO(date)]);
}
