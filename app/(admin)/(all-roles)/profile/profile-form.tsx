"use client";

import { useActionState } from "react";
import { updateProfileAction, type UpdateProfileState } from "./actions";
import Link from "next/link";

type ProfileFormProps = {
  profile: {
    first_names: string;
    last_names: string;
    email: string;
    user_role: string;
    company_name: string | null;
  };
};

const initialState: UpdateProfileState = {
  error: "",
  success: "",
};

function formatRole(role: string) {
  switch (role) {
    case "ADMIN_PLATFORM":
      return "Administrador de plataforma";
    case "ADMIN_COMPANY":
      return "Administrador de empresa";
    case "EMPLOYEE":
      return "Empleado";
    case "CUSTOMER":
      return "Cliente";
    default:
      return role;
  }
}

export default function ProfileForm({ profile }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
          <label
            htmlFor="first_names"
            className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
          >
            Nombres
          </label>
          <input
            id="first_names"
            name="first_names"
            type="text"
            defaultValue={profile.first_names}
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand-blue)]"
          />
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
          <label
            htmlFor="last_names"
            className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
          >
            Apellidos
          </label>
          <input
            id="last_names"
            name="last_names"
            type="text"
            defaultValue={profile.last_names}
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand-blue)]"
          />
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 md:col-span-2">
          <label
            htmlFor="email"
            className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
          >
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={profile.email}
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand-blue)]"
          />
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Rol
          </p>
          <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
            {formatRole(profile.user_role)}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Empresa asociada
          </p>
          <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
            {profile.company_name ?? "No aplica"}
          </p>
        </div>
      </div>

      {state.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.success}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-[var(--brand-blue)] px-5 py-3 text-sm font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Guardando..." : "Guardar cambios"}
        </button>

        <Link
          href="/change-password"
          className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--accent-soft)]"
        >
          Cambiar contraseña
        </Link>
      </div>
    </form>
  );
}