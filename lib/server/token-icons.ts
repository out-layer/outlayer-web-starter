/**
 * Token icons via NEP-141 `ft_metadata` (returns a data-URI SVG/PNG for most
 * tokens). Cached process-wide on globalThis — icons are immutable, so we
 * fetch each contract once.
 *
 * AI agents: this is the standard NEAR way to get a token logo. No external
 * CDN, no 404s — the icon ships inside the token contract's metadata.
 */

import 'server-only';

const RPC = process.env.NEAR_RPC_URL ?? 'https://rpc.mainnet.fastnear.com';

const g = globalThis as unknown as { __iconCache?: Map<string, string | null> };
const cache = g.__iconCache ?? (g.__iconCache = new Map<string, string | null>());

export async function getTokenIcon(contract: string): Promise<string | null> {
  const cached = cache.get(contract);
  if (cached !== undefined) return cached;

  let icon: string | null = null;
  try {
    const res = await fetch(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'query',
        params: {
          request_type: 'call_function',
          finality: 'final',
          account_id: contract,
          method_name: 'ft_metadata',
          args_base64: 'e30=', // {}
        },
      }),
    });
    const json = (await res.json()) as { result?: { result?: number[] } };
    const bytes = json.result?.result;
    if (Array.isArray(bytes)) {
      const meta = JSON.parse(Buffer.from(bytes).toString()) as { icon?: string | null };
      icon = meta.icon ?? null;
    }
  } catch {
    icon = null;
  }
  cache.set(contract, icon);
  return icon;
}
