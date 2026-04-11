"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import type {
  CompanyActionResult,
  CompanyCategoryOption,
  CompanyDetail,
  CompanyFormInput,
  CompanyImagePayload,
  CompanyListItem,
  CompanyQueryParams,
  CompaniesListResponse,
} from "@/lib/companies/types";
import {
  normalizeCompanyInput,
  validateCompanyInput,
} from "@/lib/companies/validation";

type CompanyRow = {
  company_id: string;
  company_code: string;
  company_name: string;
  company_photo: string | null;
  company_address: string | null;
  company_commission_rate: number;
  category_id: string;
  created_at: string;
  updated_at: string;
  categories:
    | { category_id: string; category_name: string; category_img: string | null }
    | {
        category_id: string;
        category_name: string;
        category_img: string | null;
      }[]
    | null;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const DEFAULT_QUERY: CompanyQueryParams = {
  search: "",
  categoryId: "",
  sortBy: "company_name",
  sortDir: "asc",
  page: 1,
  pageSize: 10,
};

// Revalida rutas impactadas por cambios de empresas.
function revalidateCompanyRoutes() {
  revalidatePath("/companies");
  revalidatePath("/dashboard");
  revalidatePath("/approved-offers-stats");
}

// Normaliza y protege los parámetros de lista para evitar valores inválidos.
function normalizeQueryParams(
  params?: Partial<CompanyQueryParams>,
): CompanyQueryParams {
  return {
    search: params?.search?.trim() ?? DEFAULT_QUERY.search,
    categoryId: params?.categoryId?.trim() ?? DEFAULT_QUERY.categoryId,
    sortBy: params?.sortBy ?? DEFAULT_QUERY.sortBy,
    sortDir: params?.sortDir ?? DEFAULT_QUERY.sortDir,
    page: Number(params?.page ?? DEFAULT_QUERY.page) || DEFAULT_QUERY.page,
    pageSize: Math.min(
      50,
      Number(params?.pageSize ?? DEFAULT_QUERY.pageSize) || DEFAULT_QUERY.pageSize,
    ),
  };
}

// Obtiene el nombre de categoría incluso cuando la relación llega como arreglo.
function getCategoryName(row: CompanyRow): string {
  if (!row.categories) {
    return "Sin categoria";
  }

  if (Array.isArray(row.categories)) {
    return row.categories[0]?.category_name ?? "Sin categoria";
  }

  return row.categories.category_name;
}

// Obtiene la ruta de icono de categoría desde cualquiera de las formas de relación.
function getCategoryImagePath(row: CompanyRow): string | null {
  if (!row.categories) {
    return null;
  }

  if (Array.isArray(row.categories)) {
    return row.categories[0]?.category_img ?? null;
  }

  return row.categories.category_img ?? null;
}

// Construye la URL pública de icono de categoría si en BD solo hay path.
function buildCategoryIconUrl(
  supabase: SupabaseServerClient,
  categoryImg: string | null,
): string | null {
  if (!categoryImg) {
    return null;
  }

  if (categoryImg.startsWith("http://") || categoryImg.startsWith("https://")) {
    return categoryImg;
  }

  return supabase.storage.from("categories-icons").getPublicUrl(categoryImg).data
    .publicUrl;
}

// Construye la URL pública del logo de empresa cuando en BD hay path relativo.
function buildCompanyPhotoUrl(
  supabase: SupabaseServerClient,
  companyPhoto: string | null,
): string | null {
  if (!companyPhoto) {
    return null;
  }

  if (
    companyPhoto.startsWith("http://") ||
    companyPhoto.startsWith("https://")
  ) {
    return companyPhoto;
  }

  const normalizedPath = companyPhoto.replace(/^companies-logos\//, "");

  return supabase.storage
    .from("companies-logos")
    .getPublicUrl(normalizedPath).data.publicUrl;
}

// Mapea el registro raw de Supabase al modelo que consume la UI.
function toCompanyListItem(
  row: CompanyRow,
  supabase: SupabaseServerClient,
): CompanyListItem {
  const category_img = getCategoryImagePath(row);

  return {
    company_id: row.company_id,
    company_code: row.company_code,
    company_name: row.company_name,
    company_photo: buildCompanyPhotoUrl(supabase, row.company_photo),
    company_address: row.company_address,
    company_commission_rate: Number(row.company_commission_rate),
    category_id: row.category_id,
    category_name: getCategoryName(row),
    category_img,
    category_icon_url: buildCategoryIconUrl(supabase, category_img),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Convierte dataURL (base64) a bytes para subir a Supabase Storage.
function parseDataUrl(payload: CompanyImagePayload): {
  bytes: Uint8Array;
  contentType: string;
} {
  const matches = payload.dataUrl.match(/^data:(.+);base64,(.+)$/);

  if (!matches) {
    throw new Error("Formato de imagen invalido.");
  }

  const contentType = payload.type || matches[1];
  const base64 = matches[2];
  const buffer = Buffer.from(base64, "base64");

  return {
    bytes: new Uint8Array(buffer),
    contentType,
  };
}

// Sube el logo de empresa al bucket y devuelve su URL pública.
async function uploadCompanyPhoto(
  payload: CompanyImagePayload,
  companyId: string,
): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  const supabase = await createClient();

  try {
    const { bytes, contentType } = parseDataUrl(payload);
    const extension = payload.name.includes(".")
      ? payload.name.split(".").at(-1)?.toLowerCase() ?? "jpg"
      : "jpg";
    const safeExt = extension.replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `companies/${companyId}/${Date.now()}-${randomUUID()}.${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from("companies-logos")
      .upload(path, bytes, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      return {
        ok: false,
        message: `No se pudo subir la imagen: ${uploadError.message}`,
      };
    }

    const { data } = supabase.storage.from("companies-logos").getPublicUrl(path);

    return { ok: true, publicUrl: data.publicUrl };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo procesar la imagen seleccionada.",
    };
  }
}

// Verifica unicidad de código de empresa; en error de BD corta el flujo.
async function findCompanyByCode(
  code: string,
  exceptCompanyId?: string,
): Promise<boolean> {
  const supabase = await createClient();

  let query = supabase
    .from("companies")
    .select("company_id")
    .eq("company_code", code)
    .limit(1);

  if (exceptCompanyId) {
    query = query.neq("company_id", exceptCompanyId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("No se pudo validar el codigo de empresa.");
  }

  return (data ?? []).length > 0;
}

// Lista categorías activas para filtros y selects en formularios.
export async function listCategoriesForFilter(): Promise<CompanyCategoryOption[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("category_id, category_name, category_img")
      .is("deleted_at", null)
      .order("category_name", { ascending: true });

    if (error) {
      return [];
    }

    return (data ?? []).map((category) => {
      const category_img = (category as { category_img: string | null })
        .category_img;

      return {
        category_id: (category as { category_id: string }).category_id,
        category_name: (category as { category_name: string }).category_name,
        category_img,
        category_icon_url: buildCategoryIconUrl(supabase, category_img),
      };
    });
  } catch {
    return [];
  }
}

// Lista empresas con búsqueda/filtro/orden/paginación para la tabla principal.
export async function listCompanies(
  rawParams?: Partial<CompanyQueryParams>,
): Promise<CompaniesListResponse> {
  const params = normalizeQueryParams(rawParams);
  const pageSize = Math.max(1, params.pageSize);
  const page = Math.max(1, params.page);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const supabase = await createClient();
    let query = supabase
      .from("companies")
      .select(
        "company_id, company_code, company_name, company_photo, company_address, company_commission_rate, category_id, created_at, updated_at, categories(category_id, category_name, category_img)",
        { count: "exact" },
      )
      .is("deleted_at", null);

    if (params.search) {
      query = query.or(
        `company_name.ilike.%${params.search}%,company_code.ilike.%${params.search}%`,
      );
    }

    if (params.categoryId) {
      query = query.eq("category_id", params.categoryId);
    }

    const ascending = params.sortDir === "asc";

    // Orden por categoría: se resuelve en memoria para asegurar comportamiento estable.
    if (params.sortBy === "category_name") {
      const { data, error } = await query;

      if (error) {
        return {
          data: [],
          total: 0,
          page,
          pageSize,
          error: error.message,
        };
      }

      const sorted = ((data ?? []) as CompanyRow[]).sort((a, b) => {
        const left = getCategoryName(a);
        const right = getCategoryName(b);
        const comparison = left.localeCompare(right, "es", {
          sensitivity: "base",
        });

        if (comparison === 0) {
          const tieBreaker = a.company_name.localeCompare(b.company_name, "es", {
            sensitivity: "base",
          });
          return ascending ? tieBreaker : -tieBreaker;
        }

        return ascending ? comparison : -comparison;
      });

      const paginatedRows = sorted.slice(from, to + 1);

      return {
        data: paginatedRows.map((row) => toCompanyListItem(row, supabase)),
        total: sorted.length,
        page,
        pageSize,
      };
    }

    // Orden normal por columnas directas de la tabla companies.
    query = query.order(params.sortBy, { ascending });
    const { data, count, error } = await query.range(from, to);

    if (error) {
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        error: error.message,
      };
    }

    return {
      data: ((data ?? []) as CompanyRow[]).map((row) =>
        toCompanyListItem(row, supabase),
      ),
      total: count ?? 0,
      page,
      pageSize,
    };
  } catch (error) {
    return {
      data: [],
      total: 0,
      page,
      pageSize,
      error:
        error instanceof Error
          ? error.message
          : "No fue posible cargar empresas.",
    };
  }
}

// Obtiene el detalle completo de una empresa para el modal de detalle.
export async function getCompanyDetail(
  companyId: string,
): Promise<CompanyActionResult<CompanyDetail>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("companies")
      .select(
        "company_id, company_code, company_name, company_photo, company_address, company_commission_rate, category_id, created_at, updated_at, categories(category_id, category_name, category_img)",
      )
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return {
        ok: false,
        message: "No fue posible obtener el detalle de la empresa.",
      };
    }

    return {
      ok: true,
      message: "Detalle cargado.",
      data: toCompanyListItem(data as CompanyRow, supabase),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No fue posible obtener el detalle de la empresa.",
    };
  }
}

// Crea empresa, valida unicidad de código y maneja subida opcional de imagen.
export async function createCompany(
  input: CompanyFormInput,
  file?: CompanyImagePayload | null,
): Promise<CompanyActionResult<CompanyDetail>> {
  const normalized = normalizeCompanyInput(input);
  const validation = validateCompanyInput(normalized);

  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    return {
      ok: false,
      message: firstError ?? "Datos invalidos para crear empresa.",
    };
  }

  try {
    if (await findCompanyByCode(normalized.company_code)) {
      return {
        ok: false,
        message: "El codigo de empresa ya existe.",
      };
    }

    const supabase = await createClient();

    const { data: createdCompany, error: createError } = await supabase
      .from("companies")
      .insert({
        company_code: normalized.company_code,
        company_name: normalized.company_name,
        company_address: normalized.company_address,
        company_commission_rate: Number(normalized.company_commission_rate),
        category_id: normalized.category_id,
      })
      .select("company_id")
      .single();

    if (createError || !createdCompany) {
      return {
        ok: false,
        message: createError?.message ?? "No se pudo crear la empresa.",
      };
    }

    if (file) {
      const uploadResult = await uploadCompanyPhoto(file, createdCompany.company_id);

      if (!uploadResult.ok) {
        await supabase
          .from("companies")
          .delete()
          .eq("company_id", createdCompany.company_id);

        return {
          ok: false,
          message: uploadResult.message,
        };
      }

      const { error: updatePhotoError } = await supabase
        .from("companies")
        .update({ company_photo: uploadResult.publicUrl })
        .eq("company_id", createdCompany.company_id);

      if (updatePhotoError) {
        return {
          ok: false,
          message: "La empresa fue creada, pero no se pudo asociar la imagen.",
        };
      }
    }

    const detailResult = await getCompanyDetail(createdCompany.company_id);

    if (!detailResult.ok || !detailResult.data) {
      return {
        ok: true,
        message: "Empresa creada correctamente.",
      };
    }

    revalidateCompanyRoutes();

    return {
      ok: true,
      message: "Empresa creada correctamente.",
      data: detailResult.data,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No fue posible crear la empresa.",
    };
  }
}

// Actualiza empresa y reemplaza imagen solo cuando el usuario sube una nueva.
export async function updateCompany(
  companyId: string,
  input: CompanyFormInput,
  file?: CompanyImagePayload | null,
): Promise<CompanyActionResult<CompanyDetail>> {
  const normalized = normalizeCompanyInput(input);
  const validation = validateCompanyInput(normalized);

  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    return {
      ok: false,
      message: firstError ?? "Datos invalidos para actualizar empresa.",
    };
  }

  try {
    if (await findCompanyByCode(normalized.company_code, companyId)) {
      return {
        ok: false,
        message: "El codigo de empresa ya existe para otro registro.",
      };
    }

    const supabase = await createClient();
    let photoUrl: string | undefined;

    if (file) {
      const uploadResult = await uploadCompanyPhoto(file, companyId);
      if (!uploadResult.ok) {
        return {
          ok: false,
          message: uploadResult.message,
        };
      }
      photoUrl = uploadResult.publicUrl;
    }

    const payload: Record<string, unknown> = {
      company_code: normalized.company_code,
      company_name: normalized.company_name,
      company_address: normalized.company_address,
      company_commission_rate: Number(normalized.company_commission_rate),
      category_id: normalized.category_id,
      updated_at: new Date().toISOString(),
    };

    if (photoUrl) {
      payload.company_photo = photoUrl;
    }

    const { error } = await supabase
      .from("companies")
      .update(payload)
      .eq("company_id", companyId)
      .is("deleted_at", null);

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    const detailResult = await getCompanyDetail(companyId);

    if (!detailResult.ok || !detailResult.data) {
      return {
        ok: true,
        message: "Empresa actualizada correctamente.",
      };
    }

    revalidateCompanyRoutes();

    return {
      ok: true,
      message: "Empresa actualizada correctamente.",
      data: detailResult.data,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No fue posible actualizar la empresa.",
    };
  }
}

// Elimina de forma lógica la empresa para conservar historial.
export async function softDeleteCompany(
  companyId: string,
): Promise<CompanyActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("companies")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .is("deleted_at", null);

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    revalidateCompanyRoutes();

    return {
      ok: true,
      message: "Empresa eliminada correctamente.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No fue posible eliminar la empresa.",
    };
  }
}
