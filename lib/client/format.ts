/**
 * Tiny formatting helpers — keep all big-int math in one place.
 */

export function formatYocto(yocto: string | undefined, maxFrac = 4): string {
  if (!yocto) return '0';
  const n = BigInt(yocto);
  const int = n / 10n ** 24n;
  const frac = n % 10n ** 24n;
  const fracStr = frac.toString().padStart(24, '0').slice(0, maxFrac).replace(/0+$/, '');
  return fracStr ? `${int}.${fracStr}` : `${int}`;
}

export function formatUsdt(units: string | undefined, maxFrac = 2): string {
  if (!units) return '0';
  const n = BigInt(units);
  const int = n / 1_000_000n;
  const frac = n % 1_000_000n;
  const fracStr = frac.toString().padStart(6, '0').slice(0, maxFrac).replace(/0+$/, '');
  return fracStr ? `${int}.${fracStr}` : `${int}`;
}

export function toYocto(near: string): string {
  const [intPart = '0', fracPart = ''] = near.split('.');
  const frac = fracPart.padEnd(24, '0').slice(0, 24);
  return (BigInt(intPart) * 10n ** 24n + BigInt(frac || '0')).toString();
}
