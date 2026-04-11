import RecoverPasswordForm from "./recover-password-form";

function RecoveryIcon() {
  return (
    <div className="flex size-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--brand-blue)_0%,var(--accent)_100%)] shadow-[0_22px_38px_-18px_rgba(15,61,120,0.7)] sm:size-24">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-12 text-white sm:size-15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8.75 10V8.75a3.25 3.25 0 1 1 6.5 0V10" />
        <rect x="6.25" y="10" width="11.5" height="8.5" rx="2.25" />
        <path
          d="M12 13.35a1.4 1.4 0 0 0-.88 2.49v1.31h1.76v-1.31A1.4 1.4 0 0 0 12 13.35Z"
          fill="currentColor"
          stroke="none"
        />
      </svg>
    </div>
  );
}

export default function RecoverPasswordPage() {
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-background px-4 py-8 sm:px-6 lg:px-8">
      {/* Fondo decorativo coincidente con ForgotPassword */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,61,120,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(15,61,120,0.07) 1px, transparent 1px), radial-gradient(circle at top, rgba(31,103,200,0.15), transparent 36%)",
          backgroundPosition: "center",
          backgroundSize: "42px 42px, 42px 42px, auto",
        }}
      />

      <section className="relative z-10 m-auto w-full max-w-2xl rounded-[28px] border border-[var(--border)] bg-white shadow-[0_28px_70px_-38px_rgba(15,39,73,0.35)]">
        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <header className="mx-auto flex max-w-xl flex-col items-center text-center">
            <RecoveryIcon />

            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-[2.5rem]">
              Crear nueva contraseña
            </h1>

            <p className="mt-3 max-w-lg text-sm leading-6 text-[rgba(15,39,73,0.82)] sm:text-base">
              Ingresa tu nueva contraseña para recuperar el acceso a tu cuenta.
            </p>
          </header>

          <div className="mx-auto mt-8 max-w-xl">
            <RecoverPasswordForm />
          </div>
        </div>
      </section>
    </main>
  );
}