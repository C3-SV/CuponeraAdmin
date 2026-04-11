import type { AdminFormInput, AdminEditInput } from "@/lib/platform-admins/types";

export type AdminFormErrors = Partial<Record<keyof AdminFormInput, string>>;
export type AdminEditErrors = Partial<Record<keyof AdminEditInput, string>>;

export function normalizeAdminInput(input: AdminFormInput): AdminFormInput {
  return {
    first_names: input.first_names.trim(),
    last_names: input.last_names.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
  };
}

export function normalizeAdminEditInput(input: AdminEditInput): AdminEditInput {
  return {
    first_names: input.first_names.trim(),
    last_names: input.last_names.trim(),
    user_is_active: input.user_is_active,
    new_password: input.new_password,
  };
}

export function validateAdminInput(
  input: AdminFormInput,
): { isValid: boolean; errors: AdminFormErrors } {
  const normalized = normalizeAdminInput(input);
  const errors: AdminFormErrors = {};

  if (!normalized.first_names) {
    errors.first_names = "Los nombres son obligatorios.";
  }

  if (!normalized.last_names) {
    errors.last_names = "Los apellidos son obligatorios.";
  }

  if (!normalized.email) {
    errors.email = "El correo es obligatorio.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
    errors.email = "El correo no tiene un formato válido.";
  }

  if (!normalized.password) {
    errors.password = "La contraseña es obligatoria.";
  } else if (normalized.password.length < 8) {
    errors.password = "La contraseña debe tener al menos 8 caracteres.";
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

export function validateAdminEditInput(
  input: AdminEditInput,
): { isValid: boolean; errors: AdminEditErrors } {
  const normalized = normalizeAdminEditInput(input);
  const errors: AdminEditErrors = {};

  if (!normalized.first_names) {
    errors.first_names = "Los nombres son obligatorios.";
  }

  if (!normalized.last_names) {
    errors.last_names = "Los apellidos son obligatorios.";
  }

  if (normalized.new_password && normalized.new_password.length < 8) {
    errors.new_password = "La contraseña debe tener al menos 8 caracteres.";
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}
