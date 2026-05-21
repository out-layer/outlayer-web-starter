/**
 * Safe client-side fetch helpers.
 *
 * Never call `res.json()` blindly — a 500 (or any error) can return an empty
 * body and crash the component with "Unexpected end of JSON input". These
 * helpers read the body as text first, parse only if present, and surface a
 * clean Error with the server's `error` code when the response isn't ok.
 */

'use client';

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    // Prefer the human-readable `message` (e.g. "Amount is too low for bridge,
    // try at least 204868") over the bare `error` code ("bad_request").
    const obj = data && typeof data === 'object' ? (data as { error?: string; message?: string }) : null;
    const msg = obj?.message || obj?.error || `${res.status} ${res.statusText}`;
    throw new Error(String(msg));
  }
  return data as T;
}

export async function getJson<T>(url: string): Promise<T> {
  return parse<T>(await fetch(url));
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  return parse<T>(
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}
