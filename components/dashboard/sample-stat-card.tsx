type SampleStatCardProps = {
  title: string;
  value: string;
  footer: string;
};

// Card base reutilizable para dejar ejemplos rapidos en vistas vacias.
export function SampleStatCard({ title, value, footer }: SampleStatCardProps) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-linear-to-br from-[#f4f8ff] via-white to-[#fff4ec] p-5 shadow-[0_6px_16px_-14px_rgba(226,103,33,0.28)]">
      <p className="text-sm font-medium text-[var(--text-muted)]">{title}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-3 text-xs font-medium text-[var(--accent-strong)]">
        {footer}
      </p>
    </article>
  );
}
