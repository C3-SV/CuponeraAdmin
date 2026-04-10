export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <section className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.26)]">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          Inicio de Sesion
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Flujo base listo para conectar autenticacion con Supabase.
        </p>
      </section>
    </main>
  );
}
