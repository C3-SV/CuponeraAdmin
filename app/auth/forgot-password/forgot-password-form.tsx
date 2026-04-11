"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, type ForgotPasswordState } from "./actions";

const initialState: ForgotPasswordState = {
  error: "",
  success: "",
};

export default function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    forgotPasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-sm font-medium text-[var(--text-primary)]"
        >
          {"Correo electrónico"}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="correo@ejemplo.com"
          className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand-blue)]"
        />
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

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center">
        <Link
          href="/auth/login"
          className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--accent-soft)] sm:flex-1"
        >
          Volver al login
        </Link>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-[var(--brand-blue)] px-4 py-3 text-sm font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70 sm:flex-1"
        >
          {pending ? "Enviando..." : "Enviar enlace de recuperación"}
        </button>
      </div>
    </form>
  );
}
