/**
 * Display formatting only. Values arrive from the API already computed and rounded;
 * nothing here does financial arithmetic beyond scaling for compact labels.
 */

const LOCALE = "en-IN";
const EMPTY = "—";

const inrFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrWholeFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const compactNumber = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

const quantityFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 4 });

const percentFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type Maybe<T> = T | null | undefined;

/** ₹1,23,45,678.90 — full precision with Indian digit grouping. */
export function formatMoney(value: Maybe<number>): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY;
  return inrFormatter.format(value);
}

/** ₹1,23,45,679 — whole rupees, for chart axes and dense lists. */
export function formatMoneyWhole(value: Maybe<number>): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY;
  return inrWholeFormatter.format(value);
}

const CRORE = 10_000_000;
const LAKH = 100_000;
const THOUSAND = 1_000;

/** Compact Indian notation for headline cards: ₹12.45 L, ₹5.28 Cr, ₹8.50 K. */
export function formatMoneyCompact(value: Maybe<number>): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY;
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= CRORE) return `${sign}₹${compactNumber.format(abs / CRORE)} Cr`;
  if (abs >= LAKH) return `${sign}₹${compactNumber.format(abs / LAKH)} L`;
  if (abs >= THOUSAND) return `${sign}₹${compactNumber.format(abs / THOUSAND)} K`;
  return `${sign}${inrWholeFormatter.format(abs)}`;
}

/** Signed money for P/L: +₹1,234.50 / -₹1,234.50 / ₹0.00. */
export function formatSignedMoney(value: Maybe<number>): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY;
  if (value > 0) return `+${inrFormatter.format(value)}`;
  if (value < 0) return `-${inrFormatter.format(Math.abs(value))}`;
  return inrFormatter.format(0);
}

/** 12.34% (or +12.34% with `signed`). */
export function formatPercent(value: Maybe<number>, options: { signed?: boolean } = {}): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY;
  const formatted = `${percentFormatter.format(Math.abs(value))}%`;
  if (value < 0) return `-${formatted}`;
  if (options.signed && value > 0) return `+${formatted}`;
  return formatted;
}

export function formatInteger(value: Maybe<number>): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY;
  return integerFormatter.format(value);
}

/** Units can be fractional (mutual funds): up to 4 decimals, Indian grouping. */
export function formatQuantity(value: Maybe<number>): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY;
  return quantityFormatter.format(value);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface DateParts {
  year: number;
  month: number; // 1-12
  day: number;
}

/**
 * Parse the leading `YYYY-MM-DD` of an ISO date / datetime without going through the
 * local timezone, so a date-only value never shifts by a day.
 */
export function parseIsoDateParts(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const parts = { year: Number(y), month: Number(m), day: Number(d) };
  if (parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > 31) return null;
  return parts;
}

/** `2026-09-18` → `18 Sep 2026`. */
export function formatDate(value: Maybe<string>): string {
  if (!value) return EMPTY;
  const parts = parseIsoDateParts(value);
  if (!parts) return EMPTY;
  return `${parts.day} ${MONTHS[parts.month - 1]} ${parts.year}`;
}

/** `2026-09-01` → `Sep 2026` (monthly series). */
export function formatMonth(value: Maybe<string>): string {
  if (!value) return EMPTY;
  const parts = parseIsoDateParts(value);
  if (!parts) return EMPTY;
  return `${MONTHS[parts.month - 1]} ${parts.year}`;
}

/** `2026-09-01` → `Sep '26` (chart ticks). */
export function formatMonthShort(value: Maybe<string>): string {
  if (!value) return EMPTY;
  const parts = parseIsoDateParts(value);
  if (!parts) return EMPTY;
  return `${MONTHS[parts.month - 1]} '${String(parts.year).slice(2)}`;
}

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Timestamps (import history) in the viewer's local time: `6 Oct 2026, 02:05 pm`. */
export function formatDateTime(value: Maybe<string>): string {
  if (!value) return EMPTY;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return EMPTY;
  return dateTimeFormatter.format(date);
}

/** Local calendar date → `YYYY-MM-DD` (for query params and API payloads). */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** `YYYY-MM-DD` → local Date at midnight (for date pickers). */
export function fromIsoDate(value: Maybe<string>): Date | undefined {
  if (!value) return undefined;
  const parts = parseIsoDateParts(value);
  if (!parts) return undefined;
  return new Date(parts.year, parts.month - 1, parts.day);
}

/** `HOME_PURCHASE` → `Home purchase`. */
export function humanizeEnum(value: Maybe<string>): string {
  if (!value) return EMPTY;
  const text = value.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatBytes(bytes: Maybe<number>): string {
  if (bytes === null || bytes === undefined) return EMPTY;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatInteger(count)} ${count === 1 ? singular : plural}`;
}
