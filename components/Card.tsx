/**
 * Card — visual container, used by every dashboard panel.
 * Centralizing the look here means AI agents can re-theme everything by
 * editing this one file.
 */

import type { ReactNode } from 'react';

export default function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <header className="mb-3">
        <h3 className="text-base font-semibold">{title}</h3>
        {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
      </header>
      {children}
    </section>
  );
}
