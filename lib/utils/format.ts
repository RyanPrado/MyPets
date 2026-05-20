const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/**
 * Format an ISO `YYYY-MM-DD` date string as PT-BR `DD/MM/YYYY`.
 *
 * Parsing is done on the components (not via `new Date(iso)`) to avoid
 * timezone shifts when the device locale is not UTC.
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return '';
  const [, yyyy, mm, dd] = m;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (Number.isNaN(date.getTime())) return '';
  return dateFormatter.format(date);
}

/** Format an integer amount in cents as a PT-BR BRL string (`R$ 25,50`). */
export function formatCurrencyCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '';
  return currencyFormatter.format(cents / 100);
}

/**
 * Human-friendly PT-BR age label derived from an ISO birth date.
 *
 * Returns `"6 anos"` / `"1 ano"` for ≥1 year, `"8 meses"` / `"1 mês"` for less
 * than a year, and an empty string when the input is missing or unparseable.
 */
export function computeAge(birthIso: string | null | undefined, now: Date = new Date()): string {
  if (!birthIso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthIso);
  if (!m) return '';
  const [, yyyy, mm, dd] = m;
  const birth = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (Number.isNaN(birth.getTime()) || birth.getTime() > now.getTime()) return '';

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years >= 1) return years === 1 ? '1 ano' : `${years} anos`;
  if (months >= 1) return months === 1 ? '1 mês' : `${months} meses`;
  return 'menos de 1 mês';
}

/**
 * Whole-day difference between an ISO `YYYY-MM-DD` date and `now`. Positive
 * when the target is in the future; negative when in the past. Returns
 * `null` when the input is missing/unparseable.
 */
export function daysUntil(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [, yyyy, mm, dd] = m;
  const target = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (Number.isNaN(target.getTime())) return null;
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffMs = targetMidnight.getTime() - todayMidnight.getTime();
  return Math.round(diffMs / 86_400_000);
}

/**
 * Parse a PT-BR date string `dd/mm/aaaa` into ISO `YYYY-MM-DD`. Returns
 * `null` when the input is empty, malformed, or the components don't form
 * a valid date (e.g. 31/02/2026, 99/99/9999).
 */
export function parseDateInput(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parse a PT-BR BRL string into an integer number of cents. Accepts:
 *   "R$ 25,50" → 2550
 *   "25,50"    → 2550
 *   "25"       → 2500
 *   "1.234,56" → 123456
 *   ""         → null
 * Returns `null` for malformed input, negative values, or > 2 decimals.
 */
export function parseCurrencyInput(input: string | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const raw = input.trim();
  if (!raw) return null;
  const stripped = raw.replace(/^R\$\s*/i, '').replace(/\s+/g, '');
  // After the optional prefix removal, accept either:
  //   - thousands-separated integer part: 1.234 or 1.234.567 with optional ,dd
  //   - bare integer part: 25 or 0 with optional ,dd
  const m = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(stripped);
  if (!m) return null;
  const intPart = m[1].replace(/\./g, '');
  const decPart = m[2] ?? '';
  const intCents = Number(intPart) * 100;
  const decCents =
    decPart.length === 0 ? 0 : decPart.length === 1 ? Number(decPart) * 10 : Number(decPart);
  if (!Number.isFinite(intCents) || !Number.isFinite(decCents)) return null;
  const total = intCents + decCents;
  if (total < 0) return null;
  return total;
}
