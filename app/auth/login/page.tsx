import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--bg-app)] px-4 py-10">
      <section className="w-full max-w-md overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_16px_40px_-24px_rgba(15,39,73,0.28)]">
        <div className="border-b border-[var(--border)] bg-[linear-gradient(135deg,var(--brand-blue)_0%,var(--accent)_100%)] px-7 py-8 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/75">
            Panel Admin Mundo Cupones
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Inicio de sesión
          </h1>

          <p className="mt-2 max-w-sm text-sm leading-6 text-white/80">
            Ingresa con tu cuenta para administrar empresas, empleados y cupones
            desde el panel.
          </p>
        </div>

        <div className="px-7 py-7">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}