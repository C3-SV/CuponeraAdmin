"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import type {
  CategoriesListResponse,
  CategoryActionResult,
  CategoryFormInput,
  CategoryImagePayload,
  CategoryListItem,
  CategoryQueryParams,
} from "@/lib/categories/types";
import {
  normalizeCategoryInput,
  validateCategoryInput,
} from "@/lib/categories/validation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const DEFAULT_QUERY: CategoryQueryParams = {
  search: "",
  sortBy: "category_name",
  sortDir: "asc",
  page: 1,
  pageSize: 10,
};

function normalizeQueryParams(
  params?: Partial<CategoryQueryParams>,
): CategoryQueryParams {
  return {
    search: params?.search?.trim() ?? DEFAULT_QUERY.search,
    sortBy: params?.sortBy ?? DEFAULT_QUERY.sortBy,
    sortDir: params?.sortDir ?? DEFAULT_QUERY.sortDir,
    page: Number(params?.page ?? DEFAULT_QUERY.page) || DEFAULT_QUERY.page,
    pageSize: Math.min(
      50,
      Number(params?.pageSize ?? DEFAULT_QUERY.pageSize) || DEFAULT_QUERY.pageSize,
    ),
  };
}

// Construye URL pública del icono desde path relativo en el bucket.
function buildIconUrl(
  supabase: SupabaseServerClient,
  imgPath: string | null,
): string | null {
  if (!imgPath) return null;
  if (imgPath.startsWith("http://") || imgPath.startsWith("https://")) return imgPath;
  return supabase.storage.from("categories-icons").getPublicUrl(imgPath).data.publicUrl;
}

// Convierte dataURL base64 a bytes para subir a Supabase Storage.
function parseDataUrl(payload: CategoryImagePayload): {
  bytes: Uint8Array;
  contentType: string;
} {
  const matches = payload.dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches) throw new Error("Formato de imagen inválido.");

  const contentType = payload.type || matches[1];
  const buffer = Buffer.from(matches[2], "base64");
  return { bytes: new Uint8Array(buffer), contentType };
}

// Sube el icono del rubro al bucket y devuelve la URL pública.
async function uploadCategoryIcon(
  payload: CategoryImagePayload,
  categoryId: string,
): Promise<{ ok: true; publicUrl: string; path: string } | { ok: false; message: string }> {
  const supabase = await createClient();

  try {
    const { bytes, contentType } = parseDataUrl(payload);
    const extension =
      payload.name.includes(".")
        ? (payload.name.split(".").at(-1)?.toLowerCase() ?? "png")
        : "png";
    const safeExt = extension.replace(/[^a-z0-9]/g, "") || "png";
    const path = `categories/${categoryId}/${Date.now()}-${randomUUID()}.${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from("categories-icons")
      .upload(path, bytes, { contentType, upsert: false });

    if (uploadError) {
      return { ok: false, message: `No se pudo subir la imagen: ${uploadError.message}` };
    }

    const { data } = supabase.storage.from("categories-icons").getPublicUrl(path);
    return { ok: true, publicUrl: data.publicUrl, path };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo procesar la imagen.",
    };
  }
}

// Lista rubros activos con búsqueda, orden y paginación.
export async function listCategories(
  rawParams?: Partial<CategoryQueryParams>,
): Promise<CategoriesListResponse> {
  const params = normalizeQueryParams(rawParams);
  const pageSize = Math.max(1, params.pageSize);
  const page = Math.max(1, params.page);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const supabase = await createClient();
    let query = supabase
      .from("categories")
      .select(
        "category_id, category_name, category_img, category_img_hover, alt_text, created_at, updated_at",
        { count: "exact" },
      )
      .is("deleted_at", null);

    if (params.search) {
      query = query.ilike("category_name", `%${params.search}%`);
    }

    query = query
      .order(params.sortBy, { ascending: params.sortDir === "asc" })
      .range(from, to);

    const { data, count, error } = await query;

    if (error) {
      return { data: [], total: 0, page, pageSize, error: error.message };
    }

    return {
      data: (data ?? []).map((row) => ({
        category_id: row.category_id as string,
        category_name: row.category_name as string,
        category_img: row.category_img as string | null,
        category_img_url: buildIconUrl(supabase, row.category_img as string | null),
        category_img_hover: row.category_img_hover as string | null,
        alt_text: row.alt_text as string | null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
      })),
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
      error: error instanceof Error ? error.message : "No fue posible cargar los rubros.",
    };
  }
}

// Crea rubro con icono opcional.
export async function createCategory(
  input: CategoryFormInput,
  file?: CategoryImagePayload | null,
): Promise<CategoryActionResult<CategoryListItem>> {
  const normalized = normalizeCategoryInput(input);
  const validation = validateCategoryInput(normalized);

  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    return { ok: false, message: firstError ?? "Datos inválidos." };
  }

  try {
    const supabase = await createClient();
    const { data: created, error: createError } = await supabase
      .from("categories")
      .insert({
        category_name: normalized.category_name,
        alt_text: normalized.alt_text || null,
      })
      .select("category_id")
      .single();

    if (createError || !created) {
      return { ok: false, message: createError?.message ?? "No se pudo crear el rubro." };
    }

    const categoryId = (created as { category_id: string }).category_id;

    if (file) {
      const uploadResult = await uploadCategoryIcon(file, categoryId);

      if (!uploadResult.ok) {
        await supabase.from("categories").delete().eq("category_id", categoryId);
        return { ok: false, message: uploadResult.message };
      }

      const { error: updateError } = await supabase
        .from("categories")
        .update({ category_img: uploadResult.path })
        .eq("category_id", categoryId);

      if (updateError) {
        return { ok: false, message: "Rubro creado pero no se pudo asociar la imagen." };
      }
    }

    revalidatePath("/categories");
    return { ok: true, message: "Rubro creado correctamente." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No fue posible crear el rubro.",
    };
  }
}

// Actualiza nombre/alt_text y reemplaza icono si se sube uno nuevo.
export async function updateCategory(
  categoryId: string,
  input: CategoryFormInput,
  file?: CategoryImagePayload | null,
): Promise<CategoryActionResult<CategoryListItem>> {
  const normalized = normalizeCategoryInput(input);
  const validation = validateCategoryInput(normalized);

  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    return { ok: false, message: firstError ?? "Datos inválidos." };
  }

  try {
    const supabase = await createClient();
    const payload: Record<string, unknown> = {
      category_name: normalized.category_name,
      alt_text: normalized.alt_text || null,
      updated_at: new Date().toISOString(),
    };

    if (file) {
      const uploadResult = await uploadCategoryIcon(file, categoryId);
      if (!uploadResult.ok) {
        return { ok: false, message: uploadResult.message };
      }
      payload.category_img = uploadResult.path;
    }

    const { error } = await supabase
      .from("categories")
      .update(payload)
      .eq("category_id", categoryId)
      .is("deleted_at", null);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/categories");
    return { ok: true, message: "Rubro actualizado correctamente." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No fue posible actualizar el rubro.",
    };
  }
}

// Elimina de forma lógica el rubro para conservar historial.
export async function softDeleteCategory(
  categoryId: string,
): Promise<CategoryActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("categories")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("category_id", categoryId)
      .is("deleted_at", null);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/categories");
    return { ok: true, message: "Rubro eliminado correctamente." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No fue posible eliminar el rubro.",
    };
  }
}
