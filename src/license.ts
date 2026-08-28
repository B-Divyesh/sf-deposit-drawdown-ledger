export const PRODUCT_SLUG = 'deposit-drawdown-ledger';
const LICENSE_KEY = `sb_license:${PRODUCT_SLUG}`;
const VERDICT_KEY = `sb_license_verdict:${PRODUCT_SLUG}`;
const DAY = 86_400_000;

export interface CachedVerdict {
  valid: boolean;
  checkedAt: number;
  reason?: string;
}

export function billingBase(): string {
  return (import.meta.env.VITE_BILLING_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'https://api.sociobot.in';
}

export function checkoutUrl(): string {
  return `${billingBase()}/api/v1/products/${PRODUCT_SLUG}/checkout`;
}

export function consumeReturnedLicense(): boolean {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('license')?.trim();
  if (!token) return false;
  localStorage.setItem(LICENSE_KEY, token);
  localStorage.removeItem(VERDICT_KEY);
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  return true;
}

export function storeLicense(token: string): void {
  localStorage.setItem(LICENSE_KEY, token.trim());
  localStorage.removeItem(VERDICT_KEY);
}

export function getLicense(): string | null {
  return localStorage.getItem(LICENSE_KEY);
}

export function getCachedVerdict(): CachedVerdict | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(VERDICT_KEY) ?? 'null') as CachedVerdict | null;
    return parsed && typeof parsed.valid === 'boolean' && typeof parsed.checkedAt === 'number' ? parsed : null;
  } catch {
    return null;
  }
}

export function isPaidFromCache(): boolean {
  return getCachedVerdict()?.valid === true;
}

export async function verifyLicense(force = false): Promise<CachedVerdict | null> {
  const token = getLicense();
  if (!token) return null;
  const cached = getCachedVerdict();
  if (!force && cached && Date.now() - cached.checkedAt < DAY) return cached;
  try {
    const response = await fetch(`${billingBase()}/api/v1/products/${PRODUCT_SLUG}/verify?license=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error(`Verification returned ${response.status}`);
    const body = (await response.json()) as { valid?: boolean; reason?: string };
    const verdict = { valid: body.valid === true, reason: body.reason, checkedAt: Date.now() };
    localStorage.setItem(VERDICT_KEY, JSON.stringify(verdict));
    return verdict;
  } catch {
    return cached;
  }
}
