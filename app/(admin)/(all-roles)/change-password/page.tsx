import ChangePasswordForm from "./chage-password-form";

export default function ChangePasswordPage() {
  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--brand-blue)]">
            Seguridad de la cuenta
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Cambiar contraseña
          </h1>
        </div>
      </header>

      <div className="max-w-xl rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <ChangePasswordForm />
      </div>
    </section>
  );
}