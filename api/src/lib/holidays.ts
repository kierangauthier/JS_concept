/**
 * French public holidays — backend mirror of `src/lib/holidays.ts` (frontend).
 * Hardcoded for 2025-2027; Easter-derived dates are inlined per year.
 *
 * Used by services that accept a date and must refuse work on a public
 * holiday (currently team-planning slot creation).
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

/** Returns the holiday name for a given ISO date (YYYY-MM-DD), or null. */
export function getHolidayName(isoDate: string): string | null {
  // Tolerate Date inputs by truncating to the date portion.
  const key = isoDate.length > 10 ? isoDate.slice(0, 10) : isoDate;
  return HOLIDAYS[key] ?? null;
}

export function isHoliday(isoDate: string): boolean {
  return getHolidayName(isoDate) !== null;
}
