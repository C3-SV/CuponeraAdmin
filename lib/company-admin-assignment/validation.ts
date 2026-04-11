import type {
  CompanyAdminCreateInput,
  CompanyAdminUpdateInput,
} from "@/lib/company-admin-assignment/types";

type CompanyAdminCreateErrors = Partial<Record<keyof CompanyAdminCreateInput, string>>;
type CompanyAdminUpdateErrors = Partial<Record<keyof CompanyAdminUpdateInput, string>>;

const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIMPLE_PHONE_REGEX = /^\+?[0-9]{8,15}$/;

// Normaliza entradas de nombre para evitar espacios residuales.
function normalizeName(value: string): string {
  return value.trim();
}

// Prepara payload de creacion con formatos consistentes.
export function normalizeCompanyAdminCreateInput(
  input: CompanyAdminCreateInput,
): CompanyAdminCreateInput {
  return {
    first_names: normalizeName(input.first_names),
    last_names: normalizeName(input.last_names),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    password: input.password.trim(),
    user_is_active: Boolean(input.user_is_active),
  };
}

// Prepara payload de edicion aplicando mismas reglas de formato.
export function normalizeCompanyAdminUpdateInput(
  input: CompanyAdminUpdateInput,
): CompanyAdminUpdateInput {
  return {
    first_names: normalizeName(input.first_names),
    last_names: normalizeName(input.last_names),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    user_is_active: Boolean(input.user_is_active),
  };
}

// Valida campos minimos para alta de administrador de empresa.
export function validateCompanyAdminCreateInput(
  input: CompanyAdminCreateInput,
): { isValid: boolean; errors: CompanyAdminCreateErrors } {
  const normalized = normalizeCompanyAdminCreateInput(input);
  const errors: CompanyAdminCreateErrors = {};

  if (!normalized.first_names || normalized.first_names.length < 2) {
    errors.first_names = "Los nombres deben tener al menos 2 caracteres.";
  }

  if (!normalized.last_names || normalized.last_names.length < 2) {
    errors.last_names = "Los apellidos deben tener al menos 2 caracteres.";
  }

  if (!normalized.email) {
    errors.email = "El correo es obligatorio.";
  } else if (!SIMPLE_EMAIL_REGEX.test(normalized.email)) {
    errors.email = "Formato de correo inválido.";
  }

  if (!normalized.phone) {
    errors.phone = "El teléfono es obligatorio.";
  } else if (!SIMPLE_PHONE_REGEX.test(normalized.phone)) {
    errors.phone = "Formato de teléfono inválido.";
  }

  if (!normalized.password) {
    errors.password = "La contraseña es obligatoria.";
  } else if (normalized.password.length < 8) {
    errors.password = "La contraseña debe tener al menos 8 caracteres.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Valida campos editables para actualizacion de administrador existente.
export function validateCompanyAdminUpdateInput(
  input: CompanyAdminUpdateInput,
): { isValid: boolean; errors: CompanyAdminUpdateErrors } {
  const normalized = normalizeCompanyAdminUpdateInput(input);
  const errors: CompanyAdminUpdateErrors = {};

  if (!normalized.first_names || normalized.first_names.length < 2) {
    errors.first_names = "Los nombres deben tener al menos 2 caracteres.";
  }

  if (!normalized.last_names || normalized.last_names.length < 2) {
    errors.last_names = "Los apellidos deben tener al menos 2 caracteres.";
  }

  if (!normalized.email) {
    errors.email = "El correo es obligatorio.";
  } else if (!SIMPLE_EMAIL_REGEX.test(normalized.email)) {
    errors.email = "Formato de correo inválido.";
  }

  if (!normalized.phone) {
    errors.phone = "El teléfono es obligatorio.";
  } else if (!SIMPLE_PHONE_REGEX.test(normalized.phone)) {
    errors.phone = "Formato de teléfono inválido.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
