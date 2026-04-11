import RecoverPasswordForm from "./recover-password-form";

export default function RecoverPasswordPage() {
  return (
    <section className="mx-auto max-w-md space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-[var(--brand-blue)]">
          Recuperación de acceso
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          Nueva contraseña
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Ingresa tu nueva contraseña para recuperar el acceso a tu cuenta.
        </p>
      </header>

      <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <RecoverPasswordForm />
      </div>
    </section>
  );
}