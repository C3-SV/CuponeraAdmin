import type { CategoryFormInput } from "@/lib/categories/types";

export type CategoryFormErrors = Partial<Record<keyof CategoryFormInput, string>>;

export function normalizeCategoryInput(input: CategoryFormInput): CategoryFormInput {
  return {
    category_name: input.category_name.trim(),
    alt_text: input.alt_text.trim(),
  };
}

export function validateCategoryInput(
  input: CategoryFormInput,
): { isValid: boolean; errors: CategoryFormErrors } {
  const normalized = normalizeCategoryInput(input);
  const errors: CategoryFormErrors = {};

  if (!normalized.category_name) {
    errors.category_name = "El nombre del rubro es obligatorio.";
  } else if (normalized.category_name.length < 2) {
    errors.category_name = "El nombre debe tener al menos 2 caracteres.";
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}
