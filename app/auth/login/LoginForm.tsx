"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "./actions";

const initialState = {
  error: "",
};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-white/90">
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="correo@empresa.com"
          autoComplete="email"
          required
          className="w-full rounded-2xl border border-(--border) bg-(--surface-soft) px-4 py-3 text-sm text-foreground outline-none transition focus:border-(--accent) focus:bg-white"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-white/90">
          Contraseña
        </label>

        <input
          id="password"
          name="password"
          type="password"
          placeholder="Ingresa tu contraseña"
          autoComplete="current-password"
          required
          className="w-full rounded-2xl border border-(--border) bg-(--surface-soft) px-4 py-3 text-sm text-foreground outline-none transition focus:border-(--accent) focus:bg-white"
        />

        <div className="flex justify-end mt-2">
          <Link
            href="/auth/forgot-password"
            className="inline-flex text-sm font-medium text-white/80 transition hover:text-white"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>

      {state?.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-(--brand-orange) px-4 py-3 text-sm font-semibold text-white transition hover:bg-(--brand-orange-strong) disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Ingresando..." : "Ingresar al panel"}
      </button>
    </form>
  );
}
