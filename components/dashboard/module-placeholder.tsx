import type { ReactNode } from "react";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  ownerHint?: string;
  children?: ReactNode;
};

export function ModulePlaceholder({
  title,
  description,
  ownerHint,
  children,
}: ModulePlaceholderProps) {
  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_6px_14px_-12px_rgba(15,23,42,0.24)] lg:p-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          {title}
        </h1>
        <p className="text-sm leading-relaxed text-[var(--text-muted)]">
          {description}
        </p>
        {ownerHint ? (
          <p className="inline-flex rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
            {ownerHint}
          </p>
        ) : null}
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
}
