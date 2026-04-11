"use client";

import { useActionState } from "react";
import { changePasswordAction, type ChangePasswordState } from "./actions";

const initialState: ChangePasswordState = {
  error: "",
  success: "",
};

export default function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--text-primary)]">
          Contraseña actual
        </label>
        <input
          name="currentPassword"
          type="password"
          className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm outline-none focus:border-[var(--brand-blue)]"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--text-primary)]">
          Nueva contraseña
        </label>
        <input
          name="password"
          type="password"
          className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm outline-none focus:border-[var(--brand-blue)]"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--text-primary)]">
          Confirmar nueva contraseña
        </label>
        <input
          name="confirmPassword"
          type="password"
          className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm outline-none focus:border-[var(--brand-blue)]"
        />
      </div>

      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {state.success}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[var(--brand-blue)] px-4 py-3 text-sm font-medium text-white transition hover:opacity-95 disabled:opacity-70"
      >
        {pending ? "Guardando..." : "Actualizar contraseña"}
      </button>
    </form>
  );
}