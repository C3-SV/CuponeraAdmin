import type { CompanyFormInput } from "@/lib/companies/types";

export const COMPANY_CODE_REGEX = /^[A-Z]{3}[0-9]{3}$/;

export type CompanyFormErrors = Partial<Record<keyof CompanyFormInput, string>>;

// Limpia espacios y unifica formato de campos antes de validar/persistir.
export function normalizeCompanyInput(input: CompanyFormInput): CompanyFormInput {
  return {
    company_code: input.company_code.trim().toUpperCase(),
    company_name: input.company_name.trim(),
    company_address: input.company_address.trim(),
    company_commission_rate: input.company_commission_rate.trim(),
    category_id: input.category_id.trim(),
  };
}

// Aplica reglas de negocio del formulario y devuelve errores por campo.
export function validateCompanyInput(
  input: CompanyFormInput,
): { isValid: boolean; errors: CompanyFormErrors } {
  const normalized = normalizeCompanyInput(input);
  const errors: CompanyFormErrors = {};

  if (!normalized.company_code) {
    errors.company_code = "El codigo es obligatorio.";
  } else if (!COMPANY_CODE_REGEX.test(normalized.company_code)) {
    errors.company_code = "Formato invalido. Usa 3 letras mayusculas y 3 numeros.";
  }

  if (!normalized.company_name) {
    errors.company_name = "El nombre es obligatorio.";
  } else if (normalized.company_name.length < 2) {
    errors.company_name = "El nombre debe tener al menos 2 caracteres.";
  }

  if (!normalized.company_address) {
    errors.company_address = "La direccion es obligatoria.";
  }

  if (!normalized.company_commission_rate) {
    errors.company_commission_rate = "La tasa de comision es obligatoria.";
  } else {
    const commission = Number(normalized.company_commission_rate);

    if (!Number.isFinite(commission)) {
      errors.company_commission_rate = "La tasa de comision debe ser numerica.";
    } else if (commission < 0 || commission > 1) {
      errors.company_commission_rate =
        "La tasa debe estar entre 0 y 1 (ejemplo: 0.15).";
    }
  }

  if (!normalized.category_id) {
    errors.category_id = "La categoria es obligatoria.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
