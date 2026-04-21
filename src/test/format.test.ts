import { describe, it, expect } from 'vitest';
import { fmt, plural } from '@/lib/format';

describe('fmt', () => {
  it('formats a date in fr-FR', () => {
    // Build a date at local midnight to avoid timezone shifts in CI.
    const d = new Date(2026, 3, 21); // April is month index 3
    expect(fmt.date(d)).toBe('21/04/2026');
  });

  it('returns the fallback for null / invalid dates', () => {
    expect(fmt.date(null)).toBe('—');
    expect(fmt.date(undefined)).toBe('—');
    expect(fmt.date('not-a-date', 'N/A')).toBe('N/A');
  });

  it('formats currency in EUR with 2 decimals', () => {
    const s = fmt.currency(1234.5);
    // fr-FR uses narrow no-break space + € suffix; assert on the parts.
    expect(s).toContain('1');
    expect(s).toContain('234,50');
    expect(s).toContain('€');
  });

  it('returns the fallback for null / NaN currency', () => {
    expect(fmt.currency(null)).toBe('—');
    expect(fmt.currency(NaN)).toBe('—');
  });

  it('formats percent with default 0 digits', () => {
    expect(fmt.percent(42)).toBe('42 %');
  });
});

describe('plural', () => {
  it('omits the trailing "s" when count is 0 or 1', () => {
    expect(plural(0, 'client')).toBe('0 client');
    expect(plural(1, 'client')).toBe('1 client');
  });

  it('adds "s" when count > 1', () => {
    expect(plural(2, 'client')).toBe('2 clients');
    expect(plural(42, 'client')).toBe('42 clients');
  });

  it('uses the irregular plural form when provided', () => {
    expect(plural(3, 'cheval', 'chevaux')).toBe('3 chevaux');
    expect(plural(1, 'cheval', 'chevaux')).toBe('1 cheval');
  });
});
