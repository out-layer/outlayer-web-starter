/**
 * Renders an on-chain reference from an action response:
 *  - tx_hash     → a link to NEAR Rocks (FastNear's explorer) for the tx
 *  - intent_hash → the NEAR Intents intent hash (shown as text; intents
 *    settle via the solver relay, not a single user tx)
 *
 * Explorer is mainnet (near.rocks/tx/<hash>); testnet would be
 * testnet.near.rocks. The app defaults to mainnet.
 */

export default function TxLink({
  txHash,
  intentHash,
}: {
  txHash?: string | null;
  intentHash?: string | null;
}) {
  if (txHash) {
    return (
      <a
        href={`https://near.rocks/tx/${txHash}`}
        target="_blank"
        rel="noreferrer"
        className="font-mono text-xs underline decoration-dotted hover:opacity-80"
      >
        tx {txHash.slice(0, 8)}… ↗
      </a>
    );
  }
  if (intentHash) {
    return <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">intent {intentHash.slice(0, 8)}…</span>;
  }
  return null;
}
