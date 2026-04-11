"use server";

import { createClient } from "@/lib/supabase/server";

export type RecoverPasswordState = {
  error: string;
  success: string;
};

export async function recoverPasswordAction(
  _prevState: RecoverPasswordState,
  formData: FormData,
): Promise<RecoverPasswordState> {
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!password || !confirmPassword) {
    return {
      error: "Debes completar ambos campos",
      success: "",
    };
  }

  if (password.length < 8) {
    return {
      error: "La contraseña debe tener al menos 8 caracteres",
      success: "",
    };
  }

  if (password !== confirmPassword) {
    return {
      error: "Las contraseñas no coinciden",
      success: "",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return {
      error: "No se pudo actualizar la contraseña",
      success: "",
    };
  }

  return {
    error: "",
    success: "Tu contraseña fue actualizada correctamente.",
  };
}