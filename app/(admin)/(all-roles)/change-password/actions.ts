"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdminProfile } from "@/lib/auth";

export type ChangePasswordState = {
  error: string;
  success: string;
};

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const profile = await requireAdminProfile();
  const supabase = await createClient();

  const currentPassword = String(formData.get("currentPassword") || "");
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!currentPassword || !password || !confirmPassword) {
    return {
      error: "Debes completar todos los campos",
      success: "",
    };
  }

  if (password.length < 8) {
    return {
      error: "La nueva contraseña debe tener al menos 8 caracteres",
      success: "",
    };
  }

  if (password !== confirmPassword) {
    return {
      error: "Las nuevas contraseñas no coinciden",
      success: "",
    };
  }

  if (currentPassword === password) {
    return {
      error: "La nueva contraseña no puede ser igual a la actual",
      success: "",
    };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: currentPassword,
  });

  if (signInError) {
    return {
      error: "La contraseña actual es incorrecta",
      success: "",
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password,
  });

  if (updateError) {
    return {
      error: "No se pudo actualizar la contraseña",
      success: "",
    };
  }

  return {
    error: "",
    success: "Contraseña actualizada correctamente",
  };
}