/**
 * Centralised FR formatters for dates, currency, and pluralisation.
 *
 * Prefer these helpers over ad-hoc `toLocaleDateString('fr-FR', ...)` or
 * inline ternaries — they keep formatting consistent across the app and
 * let us swap the locale in one place if needed.
 */

const LOCALE = 'fr-FR';
const CURRENCY = 'EUR';

type DateInput = Date | string | number | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const fmt = {
  /** 21/04/2026 */
  date(value: DateInput, fallback = '—'): string {
    const d = toDate(value);
    return d ? d.toLocaleDateString(LOCALE) : fallback;
  },

  /** 21 avr. 2026 */
  dateShort(value: DateInput, fallback = '—'): string {
    const d = toDate(value);
    return d
      ? d.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' })
      : fallback;
  },

  /** lun. 21 avr. */
  dateDayMonth(value: DateInput, fallback = '—'): string {
    const d = toDate(value);
    return d
      ? d.toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' })
      : fallback;
  },

  /** 21/04/2026 14:30 */
  dateTime(value: DateInput, fallback = '—'): string {
    const d = toDate(value);
    return d
      ? d.toLocaleString(LOCALE, {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : fallback;
  },

  /** 14:30 */
  time(value: DateInput, fallback = '—'): string {
    const d = toDate(value);
    return d
      ? d.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })
      : fallback;
  },

  /** 1 234,56 € */
  currency(value: number | null | undefined, fallback = '—'): string {
    if (value === null || value === undefined || Number.isNaN(value)) return fallback;
    return value.toLocaleString(LOCALE, {
      style: 'currency',
      currency: CURRENCY,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  },

  /** 1 234,56 (no currency symbol) */
  number(value: number | null | undefined, digits = 2, fallback = '—'): string {
    if (value === null || value === undefined || Number.isNaN(value)) return fallback;
    return value.toLocaleString(LOCALE, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  },

  /** 42 % */
  percent(value: number | null | undefined, digits = 0, fallback = '—'): string {
    if (value === null || value === undefined || Number.isNaN(value)) return fallback;
    return `${value.toLocaleString(LOCALE, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })} %`;
  },
};

/**
 * Format a Date as YYYY-MM-DD using the local timezone.
 *
 * Use this whenever a date string is sent to the API to represent a calendar
 * day (e.g. weekStart, formIssuedAt, dueDate). `Date.toISOString().slice(0,10)`
 * looks similar but converts to UTC first — in Europe/Paris, a Monday at
 * 00:00 local becomes the previous Sunday in UTC, breaking equality checks
 * with rows the backend stored as the Monday of that week.
 *
 * @example toISODateLocal(new Date(2026, 1, 23)) → "2026-02-23"
 */
export function toISODateLocal(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Pluralise a French word based on count. Returns "N mot(s)" form.
 * If `plural` is omitted, appends "s" when count > 1.
 *
 * @example plural(0, 'client') → "0 client"
 * @example plural(1, 'client') → "1 client"
 * @example plural(3, 'client') → "3 clients"
 * @example plural(3, 'cheval', 'chevaux') → "3 chevaux"
 */
export function plural(count: number, singular: string, pluralForm?: string): string {
  const word = count > 1 ? (pluralForm ?? `${singular}s`) : singular;
  return `${count} ${word}`;
}
