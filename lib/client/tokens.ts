/**
 * Token whitelist + unit helpers shared by Swap and Withdraw.
 *
 * defuseId values are NEAR Intents asset identifiers (verified against the
 * live /tokens catalog). AI agents: extend this list or fetch /api/tokens
 * dynamically — the rest of the UI keys off `symbol` + `decimals`.
 */

export type TokenDef = { symbol: string; defuseId: string; decimals: number };

// Tokens you can swap *into* NEAR, or withdraw out cross-chain.
export const TOKENS: TokenDef[] = [
  { symbol: 'USDT', defuseId: 'nep141:usdt.tether-token.near', decimals: 6 },
  {
    symbol: 'USDC',
    defuseId: 'nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1',
    decimals: 6,
  },
  { symbol: 'ETH', defuseId: 'nep141:eth.omft.near', decimals: 18 },
  { symbol: 'SOL', defuseId: 'nep141:sol.omft.near', decimals: 9 },
];

export const WNEAR: TokenDef = { symbol: 'wNEAR', defuseId: 'nep141:wrap.near', decimals: 24 };

export function bySymbol(symbol: string): TokenDef {
  return TOKENS.find((t) => t.symbol === symbol) ?? TOKENS[0]!;
}

export function toRaw(human: string, decimals: number): string {
  const [int = '0', frac = ''] = human.split('.');
  const f = frac.padEnd(decimals, '0').slice(0, decimals);
  return (BigInt(int || '0') * 10n ** BigInt(decimals) + BigInt(f || '0')).toString();
}

export function fromRaw(raw: string, decimals: number, maxFrac = 4): string {
  const n = BigInt(raw || '0');
  const d = 10n ** BigInt(decimals);
  const int = n / d;
  const frac = (n % d).toString().padStart(decimals, '0').slice(0, maxFrac).replace(/0+$/, '');
  return frac ? `${int}.${frac}` : `${int}`;
}
