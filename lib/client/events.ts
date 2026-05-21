/**
 * Tiny client-side event bus for "balances changed".
 *
 * Action cards (deposit / swap / withdraw) fire refreshBalances() on success;
 * BalanceCard subscribes and refetches. Zero-dependency, decoupled — no
 * context provider to thread through the tree.
 */

'use client';

const EVT = 'outlayer:refresh-balances';

export function refreshBalances(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVT));
}

export function onRefreshBalances(fn: () => void): () => void {
  window.addEventListener(EVT, fn);
  return () => window.removeEventListener(EVT, fn);
}
