/**
 * Account page — wallet identity + API key export.
 *
 * The API key is the wallet's bearer credential. We hide it behind a Reveal
 * click and render a QR so it can be moved to another device (paste / scan
 * into "Sign in with API key"). Treat it like a private key.
 */

'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Card from './Card';
import { getJson } from '@/lib/client/api';

type Account = {
  apiKey: string;
  walletId: string;
  nearAccountId: string;
  linkedAddresses: Array<{ chain: string; address: string }>;
};

export default function AccountPanel() {
  const [acct, setAcct] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getJson<Account>('/api/account')
      .then(setAcct)
      .catch((e) => setError((e as Error).message));
  }, []);

  function copyKey() {
    if (!acct) return;
    navigator.clipboard.writeText(acct.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Card title="Identity" hint="Your custody wallet and the addresses you've signed in with.">
        {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
        {!acct && !error && <p className="text-sm text-neutral-500">Loading…</p>}
        {acct && (
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="text-neutral-500 dark:text-neutral-400">NEAR account</dt>
            <dd className="font-mono break-all">{acct.nearAccountId}</dd>
            <dt className="text-neutral-500 dark:text-neutral-400">Wallet ID</dt>
            <dd className="font-mono break-all">{acct.walletId}</dd>
            <dt className="text-neutral-500 dark:text-neutral-400">Signed in via</dt>
            <dd>
              {acct.linkedAddresses.length
                ? acct.linkedAddresses.map((l) => `${l.chain} (${l.address.slice(0, 8)}…)`).join(', ')
                : 'API key'}
            </dd>
          </dl>
        )}
      </Card>

      {acct && (
        <Card
          title="API key"
          hint="Bearer credential — full wallet control (bounded by policy). Anyone with it controls the wallet. Set a policy before holding real funds."
        >
          {!revealed ? (
            <button
              type="button"
              className="rounded-lg border px-4 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              onClick={() => setRevealed(true)}
            >
              Reveal API key
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <code className="flex-1 break-all rounded-lg bg-neutral-100 px-3 py-2 text-xs dark:bg-neutral-800">
                  {acct.apiKey}
                </code>
                <button
                  type="button"
                  className="shrink-0 rounded-lg border px-3 py-2 text-xs hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  onClick={copyKey}
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div>
                <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
                  Scan on another device, then use “Sign in with API key”:
                </p>
                <div className="inline-block rounded-xl bg-white p-3">
                  <QRCodeSVG value={acct.apiKey} size={160} />
                </div>
              </div>
              <button
                type="button"
                className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                onClick={() => setRevealed(false)}
              >
                Hide
              </button>
            </div>
          )}
        </Card>
      )}
    </>
  );
}
