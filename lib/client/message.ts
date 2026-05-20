/**
 * Build the message that every chain wallet signs.
 *
 * Same shape for all chains so backend verifiers share parsing/freshness logic.
 */

export function buildSignInMessage(): string {
  return JSON.stringify({
    action: 'sign_in',
    domain: typeof window !== 'undefined' ? window.location.host : 'localhost',
    version: 1,
    nonce: crypto.randomUUID(),
    timestamp: Date.now(),
  });
}
