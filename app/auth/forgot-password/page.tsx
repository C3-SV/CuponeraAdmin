import ForgotPasswordForm from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <section className="mx-auto max-w-md space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-[var(--brand-blue)]">
          Recuperación de acceso
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          Olvidé mi contraseña
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
        </p>
      </header>

      <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <ForgotPasswordForm />
      </div>
    </section>
  );
}