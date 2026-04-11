"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdminProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type UpdateProfileState = {
  error: string;
  success: string;
};

export async function updateProfileAction(
  _prevState: UpdateProfileState,
  formData: FormData
): Promise<UpdateProfileState> {
  const currentProfile = await requireAdminProfile();
  const supabase = await createClient();

  const firstNames = String(formData.get("first_names") || "").trim();
  const lastNames = String(formData.get("last_names") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!firstNames || !lastNames || !email) {
    return {
      error: "Todos los campos son requeridos",
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

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      first_names: firstNames,
      last_names: lastNames,
    })
    .eq("user_id", currentProfile.user_id);

  if (profileError) {
    return {
      error: "No se pudo actualizar el perfil",
      success: "",
    };
  }

  if (email !== currentProfile.email.toLowerCase()) {
    const { error: emailError } = await supabase.auth.updateUser({ email });

    if (emailError) {
      return {
        error: "Se actualizó el nombre, pero no se pudo actualizar el correo",
        success: "",
      };
    }
  }

  revalidatePath("/profile");

  return {
    error: "",
    success: "Perfil actualizado correctamente",
  };
}