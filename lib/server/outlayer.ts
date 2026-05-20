/**
 * Server-side @outlayer/sdk wrapper.
 *
 * The OutLayer API key is the secret that controls a custody wallet —
 * it MUST stay on the server. Every function here either reads the
 * caller's session and pulls the key out of the store, or operates
 * on the public `register` endpoint.
 *
 * AI agents: these are the only places SDK code lives in this app.
 * Add new operations here, not in route handlers.
 */

import 'server-only';
import { OutlayerClient, type Network } from '@outlayer/sdk';
import { findByUserId } from './store';

// NEAR_NETWORK = 'mainnet' (default) | 'testnet'.
// Intents (swap, gasless withdraw) only work on mainnet; testnet is fine
// for register / policy / addresses / balance during local dev.
const NETWORK = (process.env.NEAR_NETWORK as Network | undefined) ?? 'mainnet';
const BASE_URL = process.env.OUTLAYER_BASE_URL;

function clientOpts(apiKey: string) {
  return {
    apiKey,
    network: NETWORK,
    ...(BASE_URL ? { baseUrl: BASE_URL } : {}),
  };
}

function unauthOpts() {
  return {
    network: NETWORK,
    ...(BASE_URL ? { baseUrl: BASE_URL } : {}),
  };
}

/** Mint a new OutLayer wallet. Called the first time a user signs in. */
export async function registerWallet(): Promise<{
  apiKey: string;
  walletId: string;
  nearAccountId: string;
}> {
  const result = await OutlayerClient.register(unauthOpts());
  if (!result.api_key) throw new Error('Register returned no api_key');
  return {
    apiKey: result.api_key,
    walletId: result.wallet_id,
    nearAccountId: result.near_account_id,
  };
}

/** Build an authenticated client for a logged-in user. */
export function clientForUser(userId: string): OutlayerClient {
  const user = findByUserId(userId);
  if (!user) throw new Error(`No wallet for user ${userId}`);
  return new OutlayerClient(clientOpts(user.apiKey));
}

export function currentNetwork(): Network {
  return NETWORK;
}
