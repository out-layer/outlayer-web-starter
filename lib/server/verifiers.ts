/**
 * Signature verifiers — one function per chain.
 *
 * Each verifier returns the canonical address that was proven if the
 * signature checks out, or null if it doesn't. We don't trust the
 * client-supplied address — we recover it from the signature.
 *
 * AI agents: these are pure functions. Swap in whatever libs you prefer
 * (ethers, @noble, near-api-js) as long as the contract is the same.
 */

import { verifyMessage } from 'viem';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { sha256 } from '@noble/hashes/sha256';
import { serialize } from 'borsh';

// ---------------------------------------------------------------------------
// Common sign-in message shape
// ---------------------------------------------------------------------------

export type SignInMessage = {
  action: 'sign_in';
  domain: string;
  version: 1;
  nonce: string;
  timestamp: number;
};

export function buildMessage(domain: string, nonce: string): string {
  const msg: SignInMessage = {
    action: 'sign_in',
    domain,
    version: 1,
    nonce,
    timestamp: Date.now(),
  };
  return JSON.stringify(msg);
}

const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000;

export function isMessageFresh(message: string): boolean {
  try {
    const parsed = JSON.parse(message) as SignInMessage;
    if (parsed.action !== 'sign_in') return false;
    if (parsed.version !== 1) return false;
    if (typeof parsed.timestamp !== 'number') return false;
    return Math.abs(Date.now() - parsed.timestamp) < MAX_TIMESTAMP_SKEW_MS;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Ethereum (EIP-191 personal_sign)
// ---------------------------------------------------------------------------

export async function verifyEthereum(args: {
  address: string;
  signature: string;
  message: string;
}): Promise<string | null> {
  if (!isMessageFresh(args.message)) return null;
  const ok = await verifyMessage({
    address: args.address as `0x${string}`,
    message: args.message,
    signature: args.signature as `0x${string}`,
  });
  return ok ? args.address.toLowerCase() : null;
}

// ---------------------------------------------------------------------------
// Solana (signMessage / ed25519)
// ---------------------------------------------------------------------------

export function verifySolana(args: {
  address: string;
  signature: string; // base58
  message: string;
}): string | null {
  if (!isMessageFresh(args.message)) return null;
  try {
    const pubkey = bs58.decode(args.address);
    const sig = bs58.decode(args.signature);
    const msg = new TextEncoder().encode(args.message);
    const ok = nacl.sign.detached.verify(msg, sig, pubkey);
    return ok ? args.address : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// NEAR (NEP-413 signMessage)
// https://github.com/near/NEPs/blob/master/neps/nep-0413.md
// ---------------------------------------------------------------------------

const NEP_413_PREFIX = 2147484061; // 2^31 + 413, prepended as little-endian u32
const NEP_413_TAG = NEP_413_PREFIX;

const nep413Schema = {
  struct: {
    tag: 'u32',
    message: 'string',
    nonce: { array: { type: 'u8', len: 32 } },
    recipient: 'string',
    callbackUrl: { option: 'string' },
  },
};

export function verifyNear(args: {
  accountId: string;
  publicKey: string;   // 'ed25519:<base58>'
  signature: string;   // base64
  message: string;     // app-side message JSON
  nonce: string;       // base64 — 32 bytes
  recipient: string;
}): string | null {
  if (!isMessageFresh(args.message)) return null;
  try {
    const pkBase58 = args.publicKey.replace(/^ed25519:/, '');
    const pubkey = bs58.decode(pkBase58);
    const sig = Buffer.from(args.signature, 'base64');
    const nonce = Buffer.from(args.nonce, 'base64');
    if (nonce.length !== 32) return null;

    const payload = serialize(nep413Schema, {
      tag: NEP_413_TAG,
      message: args.message,
      nonce: Array.from(nonce),
      recipient: args.recipient,
      callbackUrl: null,
    });
    const hashed = sha256(payload);

    const ok = nacl.sign.detached.verify(hashed, sig, pubkey);
    return ok ? args.accountId : null;
  } catch {
    return null;
  }
}
