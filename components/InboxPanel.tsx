/**
 * Inbox page — what the user's OutLayer agents left them.
 *
 * A notice asks nothing: Got it closes it. A task that asks something — a
 * confirmation, an answer — is approved in the OutLayer dashboard, where it
 * is shown first. Every value is drawn as text: a task's words are the
 * agent's, and nothing in them is a link or markup.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Card from './Card';
import { getJson, postJson } from '@/lib/client/api';

type Task = {
  id: string;
  kind: 'confirm' | 'input' | 'notice';
  from: string;
  project: string;
  createdAt: number;
  expiresAt: number;
  title: string | null;
  fields: Array<{ label: string; values: string[]; byAgent: boolean }>;
  files: number;
  unread: string | null;
  link: string;
};

type Delivery = { type: string; taskId: string; kind: string | null; at: number };

type Inbox =
  | { connected: false; webhook: boolean }
  | { connected: true; webhook: boolean; validUntil: number; tasks: Task[]; more: boolean; notifying: boolean; deliveries: Delivery[] };

const KIND_WORDS: Record<Task['kind'], string> = { confirm: 'asks you to confirm', input: 'asks you for something', notice: 'notice' };
const when = (unix: number) => new Date(unix * 1000).toLocaleString();

export default function InboxPanel() {
  const [box, setBox] = useState<Inbox | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    getJson<Inbox>('/api/inbox/tasks')
      .then((read) => {
        setBox(read);
        setError(null);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  // Read with the page, and again every fifteen seconds while it is open.
  useEffect(() => {
    load();
    const timer = setInterval(load, 15_000);
    return () => clearInterval(timer);
  }, [load]);

  async function act(what: string, url: string) {
    setBusy(what);
    setError(null);
    try {
      await postJson(url, {});
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (!box) {
    return <Card title="Inbox">{error ? <p className="text-sm text-red-700 dark:text-red-400">{error}</p> : <p className="text-sm text-neutral-500">Loading…</p>}</Card>;
  }

  if (!box.connected) {
    return (
      <Card title="Inbox" hint="What your OutLayer agents leave you: confirmations, questions, and notices.">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Your tasks are encrypted to your devices. Connecting makes this app one of them: your OutLayer wallet signs one
          message that lets this server read your inbox for seven days. No transaction, no fee. You can withdraw it from the
          OutLayer dashboard&apos;s inbox settings.
        </p>
        {error && <p className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
        <button
          type="button"
          onClick={() => act('connect', '/api/inbox/session')}
          disabled={busy !== null}
          className="mt-3 rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {busy === 'connect' ? 'Connecting…' : 'Connect the inbox'}
        </button>
      </Card>
    );
  }

  return (
    <>
      <Card title="Inbox" hint={`Connected until ${when(box.validUntil)}. A task that arrived before you connected is encrypted to your other devices only.`}>
        {error && <p className="mb-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
        {box.tasks.length === 0 && <p className="text-sm text-neutral-500">Nothing waits for you.</p>}
        <ul className="space-y-3">
          {box.tasks.map((task) => (
            <li key={task.id} className="rounded-xl border p-4 dark:border-neutral-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{task.title ?? 'A task this device cannot read'}</span>
                <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  {KIND_WORDS[task.kind]}
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                <span className="font-mono">{task.from}</span> · <span className="font-mono">{task.project}</span> · {when(task.createdAt)}
              </p>
              {task.unread && <p className="mt-2 text-xs text-neutral-500">Not read here: {task.unread}.</p>}
              {task.fields.length > 0 && (
                <dl className="mt-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-[10rem_1fr]">
                  {task.fields.map((field, at) => (
                    <div key={at} className="contents">
                      <dt className="text-neutral-500">{field.label}</dt>
                      <dd className="whitespace-pre-wrap break-words">
                        {field.values.join('\n')}
                        {field.byAgent && <span className="ml-1 text-xs text-neutral-400" title="written by the agent">🤖</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {task.files > 0 && <p className="mt-1 text-xs text-neutral-500">{task.files} file(s) — open them in the OutLayer inbox.</p>}
              <div className="mt-3">
                {task.kind === 'notice' ? (
                  <button
                    type="button"
                    onClick={() => act(task.id, `/api/inbox/tasks/${encodeURIComponent(task.id)}/acknowledge`)}
                    disabled={busy !== null}
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  >
                    {busy === task.id ? 'Closing…' : 'Got it'}
                  </button>
                ) : (
                  <a href={task.link} target="_blank" rel="noreferrer" className="text-sm underline">
                    Review and approve in OutLayer
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
        {box.more && <p className="mt-2 text-xs text-neutral-500">These are the newest; more wait.</p>}
      </Card>

      <Card title="Notifications" hint="The inbox can tell this app of every new task instead of being asked.">
        {!box.webhook ? (
          <p className="text-sm text-neutral-500">Set INBOX_PUBLIC_URL to this app&apos;s public HTTPS address to receive them.</p>
        ) : box.notifying ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-300">This app is told of new tasks.</p>
        ) : (
          <>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Your OutLayer wallet signs one message naming this app&apos;s address. An owner has one such address: this
              replaces any other you named.
            </p>
            <button
              type="button"
              onClick={() => act('webhook', '/api/inbox/webhook/name')}
              disabled={busy !== null}
              className="mt-3 rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              {busy === 'webhook' ? 'Connecting…' : 'Connect notifications'}
            </button>
          </>
        )}
        {box.deliveries.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-neutral-500">
            {box.deliveries.map((d, at) => (
              <li key={at}>
                {when(d.at)} · {d.type}
                {d.kind ? ` (${d.kind})` : ''} · <span className="font-mono">{d.taskId}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
