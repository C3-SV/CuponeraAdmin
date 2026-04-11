import type { EmployeeFormInput } from "@/lib/company-employees/types";

export type EmployeeFormErrors = Partial<Record<keyof EmployeeFormInput, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmployeeInput(
  input: EmployeeFormInput,
): EmployeeFormInput {
  return {
    email: input.email.trim().toLowerCase(),
    password: input.password,
    first_names: input.first_names.trim(),
    last_names: input.last_names.trim(),
    user_is_active: input.user_is_active,
  };
}

export function validateEmployeeInput(
  input: EmployeeFormInput,
  options: { mode: "create" | "edit" },
): { isValid: boolean; errors: EmployeeFormErrors } {
  const normalized = normalizeEmployeeInput(input);
  const errors: EmployeeFormErrors = {};

  if (!normalized.email) {
    errors.email = "El correo es obligatorio.";
  } else if (!EMAIL_REGEX.test(normalized.email)) {
    errors.email = "Ingresa un correo valido.";
  }

  if (options.mode === "create" && !normalized.password) {
    errors.password = "La contraseña es obligatoria.";
  } else if (normalized.password && normalized.password.length < 6) {
    errors.password = "La contraseña debe tener al menos 6 caracteres.";
  }

  if (!normalized.first_names) {
    errors.first_names = "Los nombres son obligatorios.";
  }

  if (!normalized.last_names) {
    errors.last_names = "Los apellidos son obligatorios.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
