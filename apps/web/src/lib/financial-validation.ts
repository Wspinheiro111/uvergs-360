const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseBrlCents(input: string): number {
  const raw = input.trim().replace(/\s|R\$/gi, "");
  if (!raw) return 0;
  let normalized: string;
  if (raw.includes(",")) normalized = raw.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) normalized = raw.replace(/\./g, "");
  else normalized = raw;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return 0;
  const amount = Number(normalized);
  return Number.isSafeInteger(Math.round(amount * 100)) ? Math.round(amount * 100) : 0;
}

export function isValidIsoDate(input: string): boolean {
  const match = ISO_DATE.exec(input);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.getUTCFullYear() === year && value.getUTCMonth() === month - 1 && value.getUTCDate() === day;
}
