/**
 * The owner's inbox, read by this server: what the user's OutLayer agents
 * left them — confirmations, questions, and notices that ask nothing.
 *
 * Every task is encrypted to the owner's devices. This server is one of them:
 * it makes a device key, keeps it here (never in the browser), and the user's
 * custody wallet signs one statement that signs it in — from the user's click,
 * for as long as their session here lasts. A notice is closed here with Got
 * it; a task that asks something is approved in the OutLayer dashboard, where
 * it is shown first.
 *
 * Told at a URL instead of asking: the owner names this app's
 * `/api/inbox/webhook` (one URL per owner — it replaces any other) and the
 * inbox POSTs each new task there, signed with a secret told once. A
 * delivery carries nothing of what a task shows; the page reads the task.
 *
 * AI agents: like the user store, this keeps its state in memory. Put
 * `device`, `token`, `validUntil` and `secret` in your database next to the
 * user's API key, with the same care: the device key reads the user's tasks.
 */

import 'server-only';
import { NETWORK_BASE_URLS, inbox } from '@outlayer/sdk';
import { clientForUser, currentNetwork } from './outlayer';
import { findByUserId } from './store';

const BASE_URL = process.env.OUTLAYER_BASE_URL ?? NETWORK_BASE_URLS[currentNetwork()];
/** The contract the wallet's statements are signed for. */
const RECIPIENT = currentNetwork() === 'testnet' ? 'outlayer.testnet' : 'outlayer.near';
/** As long as a session of this app lasts (lib/server/session.ts). */
const DEVICE_SECONDS = 60 * 60 * 24 * 7;
/** The deliveries kept for the page to show. */
const KEPT_DELIVERIES = 20;

export type Delivery = { type: string; taskId: string; kind: string | null; at: number };

type Connected = {
  account: string;
  /** The device's private key, PKCS#8 — reads the user's tasks. */
  device: string;
  token: string;
  deviceId: string;
  validUntil: number;
  /** The secret deliveries are signed with, once a URL is named. */
  secret: string | null;
  deliveries: Delivery[];
};

type State = { byUserId: Map<string, Connected> };
const g = globalThis as unknown as { __outlayerInbox?: State };
const state: State = g.__outlayerInbox ?? (g.__outlayerInbox = { byUserId: new Map() });

function accountOf(userId: string): string {
  const user = findByUserId(userId);
  if (!user) throw new Error(`No wallet for user ${userId}`);
  return user.nearAccountId;
}

function connected(userId: string): Connected | null {
  const held = state.byUserId.get(userId);
  if (!held) return null;
  if (held.validUntil <= Math.floor(Date.now() / 1000)) {
    state.byUserId.delete(userId);
    return null;
  }
  return held;
}

function sessionOf(held: Connected): inbox.Session {
  return { baseUrl: BASE_URL, token: held.token, deviceId: held.deviceId, accountId: held.account, validUntil: held.validUntil };
}

/** A session the inbox ended — signed out, replaced by a later sign-in — is forgotten here too. */
async function within<T>(userId: string, work: (held: Connected) => Promise<T>): Promise<T> {
  const held = connected(userId);
  if (!held) throw new InboxNotConnected();
  try {
    return await work(held);
  } catch (e) {
    if (e instanceof inbox.InboxRefused && e.status === 401) {
      state.byUserId.delete(userId);
      throw new InboxNotConnected();
    }
    throw e;
  }
}

export class InboxNotConnected extends Error {
  constructor() {
    super('The inbox is not connected');
  }
}

/** Sign this server in as a device of the user's: one signature of their custody wallet. From the user's click. */
export async function connect(userId: string): Promise<{ validUntil: number }> {
  const account = accountOf(userId);
  const device = await inbox.newDevice();
  const validUntil = Math.floor(Date.now() / 1000) + DEVICE_SECONDS;
  const session = await inbox.signIn(
    { baseUrl: BASE_URL, recipient: RECIPIENT },
    inbox.walletSigner(clientForUser(userId)),
    account,
    device,
    validUntil,
  );
  state.byUserId.set(userId, {
    account,
    device: await inbox.exportDevice(device),
    token: session.token,
    deviceId: session.deviceId,
    validUntil: session.validUntil,
    secret: state.byUserId.get(userId)?.secret ?? null,
    deliveries: state.byUserId.get(userId)?.deliveries ?? [],
  });
  return { validUntil: session.validUntil };
}

export type ShownTask = {
  id: string;
  kind: 'confirm' | 'input' | 'notice';
  from: string;
  project: string;
  createdAt: number;
  expiresAt: number;
  /** Read here: the title and the fields. Absent for a task this device cannot read. */
  title: string | null;
  fields: Array<{ label: string; values: string[]; byAgent: boolean }>;
  files: number;
  /** Why it is not read here: locked (it arrived before this device signed in), or it does not open. */
  unread: string | null;
  /** Where a task that asks something is approved. */
  link: string;
};

/** What waits for the user, each task read on this server's device. */
export async function readInbox(userId: string): Promise<{ validUntil: number; tasks: ShownTask[]; more: boolean; notifying: boolean; deliveries: Delivery[] }> {
  return within(userId, async (held) => {
    const device = await inbox.importDevice(held.device);
    const { tasks, more } = await inbox.listTasks(sessionOf(held));
    const shown = await Promise.all(
      tasks.map(async (listed): Promise<ShownTask> => {
        const base = {
          id: listed.id,
          kind: listed.kind,
          from: listed.preparer,
          project: listed.project_id,
          createdAt: listed.created_at,
          expiresAt: listed.expires_at,
          link: `https://app.outlayer.ai/inbox/${encodeURIComponent(listed.id)}`,
        };
        if (listed.locked) return { ...base, title: null, fields: [], files: 0, unread: 'locked on this device' };
        try {
          const read = await inbox.readTask(device, listed, held.account);
          return {
            ...base,
            title: read.envelope.display.title,
            fields: read.envelope.display.fields.map((f) => ({ label: f.label, values: f.values, byAgent: f.written_by === 'agent' })),
            files: read.envelope.files.length,
            unread: null,
          };
        } catch (e) {
          return { ...base, title: null, fields: [], files: 0, unread: (e as Error).message };
        }
      }),
    );
    return { validUntil: held.validUntil, tasks: shown, more, notifying: held.secret !== null, deliveries: held.deliveries };
  });
}

/** Got it: the user saw a notice. */
export async function gotIt(userId: string, id: string): Promise<void> {
  await within(userId, (held) => inbox.acknowledge(sessionOf(held), id));
}

/**
 * Name `url` as the URL the user's task events go to. The custody wallet
 * confirms it; the secret is kept here and checks every delivery.
 */
export async function connectNotifications(userId: string, url: string): Promise<void> {
  await within(userId, async (held) => {
    held.secret = await inbox.nameWebhook({ ...sessionOf(held), recipient: RECIPIENT }, url, inbox.walletSigner(clientForUser(userId)));
  });
}

/**
 * A delivery, as the inbox POSTed it: kept when it is signed with the secret
 * of the owner it names, refused otherwise. `body` is the bytes received.
 */
export async function received(body: string, signature: string | null): Promise<boolean> {
  let told: { type?: unknown; task_id?: unknown; kind?: unknown; owner?: unknown };
  try {
    told = JSON.parse(body);
  } catch {
    return false;
  }
  const held = [...state.byUserId.values()].find((h) => h.account === told.owner && h.secret !== null);
  if (!held?.secret || !(await inbox.verifyWebhook(body, signature, held.secret))) return false;
  if (typeof told.type !== 'string' || typeof told.task_id !== 'string') return false;
  held.deliveries = [
    { type: told.type, taskId: told.task_id, kind: typeof told.kind === 'string' ? told.kind : null, at: Math.floor(Date.now() / 1000) },
    ...held.deliveries,
  ].slice(0, KEPT_DELIVERIES);
  return true;
}

/** The URL deliveries reach: this app's own, when it is public. */
export function webhookUrl(): string | null {
  const base = process.env.INBOX_PUBLIC_URL;
  return base ? `${base.replace(/\/+$/, '')}/api/inbox/webhook` : null;
}
