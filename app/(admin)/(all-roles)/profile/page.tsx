import { requireAdminProfile } from "@/lib/auth";
import { logoutAction } from "@/app/auth/logout/actions";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const profile = await requireAdminProfile();

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--brand-blue)]">
              Cuenta administrativa
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Mi perfil
            </h1>
            <p className="max-w-2xl text-sm text-[var(--text-muted)]">
              Actualiza tu información personal y administra tu cuenta.
            </p>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>

      <div className="grid gap-6 ">
        <article className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-base font-semibold text-[var(--brand-blue)]">
              {profile.first_names?.[0]}
              {profile.last_names?.[0]}
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                {profile.full_name}
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                {profile.email}
              </p>
            </div>
          </div>

          <ProfileForm
            profile={{
              first_names: profile.first_names,
              last_names: profile.last_names,
              email: profile.email,
              user_role: profile.user_role,
              company_name: profile.company_name,
            }}
          />
        </article>
      </div>
    </section>
  );
}
