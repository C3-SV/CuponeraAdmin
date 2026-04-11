"use server";

import { createClient } from "@/lib/supabase/server";

export type ForgotPasswordState = {
  error: string;
  success: string;
};

export async function forgotPasswordAction(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!email) {
    return {
      error: "Debes ingresar tu correo electrónico",
      success: "",
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      error: "Ingresa un correo válido",
      success: "",
    };
  }

  const supabase = await createClient();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    return {
      error: "Falta configurar NEXT_PUBLIC_APP_URL",
      success: "",
    };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/auth/recover-password`,
  });

  if (error) {
    return {
      error: "No se pudo enviar el correo de recuperación",
      success: "",
    };
  }

  return {
    error: "",
    success: "Te enviamos un enlace para restablecer tu contraseña.",
  };
}