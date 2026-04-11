"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  AdminActionResult,
  AdminEditInput,
  AdminFormInput,
  AdminListItem,
  AdminQueryParams,
  AdminsListResponse,
} from "@/lib/platform-admins/types";
import {
  normalizeAdminEditInput,
  normalizeAdminInput,
  validateAdminEditInput,
  validateAdminInput,
} from "@/lib/platform-admins/validation";

type ProfileRow = {
  user_id: string;
  first_names: string;
  last_names: string;
  user_is_active: boolean;
  created_at: string;
  updated_at: string;
};

const DEFAULT_QUERY: AdminQueryParams = {
  search: "",
  sortBy: "first_names",
  sortDir: "asc",
  page: 1,
  pageSize: 10,
};

function normalizeQueryParams(
  params?: Partial<AdminQueryParams>,
): AdminQueryParams {
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

// Obtiene el email del usuario desde Supabase Auth dado su user_id.
async function getAuthEmailsMap(
  userIds: string[],
): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};

  const adminClient = createAdminClient();
  const emailMap: Record<string, string> = {};

  // Supabase admin API devuelve lista paginada de users; filtramos los que necesitamos.
  const { data, error } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error || !data) return emailMap;

  for (const user of data.users) {
    if (userIds.includes(user.id) && user.email) {
      emailMap[user.id] = user.email;
    }
  }

  return emailMap;
}

// Lista admins de plataforma con búsqueda, orden y paginación.
export async function listPlatformAdmins(
  rawParams?: Partial<AdminQueryParams>,
): Promise<AdminsListResponse> {
  const params = normalizeQueryParams(rawParams);
  const pageSize = Math.max(1, params.pageSize);
  const page = Math.max(1, params.page);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const supabase = await createClient();
    let query = supabase
      .from("profiles")
      .select(
        "user_id, first_names, last_names, user_is_active, created_at, updated_at",
        { count: "exact" },
      )
      .eq("user_role", "ADMIN_PLATFORM")
      .is("deleted_at", null);

    if (params.search) {
      query = query.or(
        `first_names.ilike.%${params.search}%,last_names.ilike.%${params.search}%`,
      );
    }

    query = query
      .order(params.sortBy, { ascending: params.sortDir === "asc" })
      .range(from, to);

    const { data, count, error } = await query;

    if (error) {
      return { data: [], total: 0, page, pageSize, error: error.message };
    }

    const rows = (data ?? []) as ProfileRow[];
    const userIds = rows.map((r) => r.user_id);
    const emailMap = await getAuthEmailsMap(userIds);

    return {
      data: rows.map((row) => ({
        user_id: row.user_id,
        email: emailMap[row.user_id] ?? "",
        first_names: row.first_names,
        last_names: row.last_names,
        full_name: `${row.first_names} ${row.last_names}`.trim(),
        user_is_active: row.user_is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
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
      error:
        error instanceof Error
          ? error.message
          : "No fue posible cargar los administradores.",
    };
  }
}

// Crea usuario en Supabase Auth + inserta perfil con rol ADMIN_PLATFORM.
export async function createPlatformAdmin(
  input: AdminFormInput,
): Promise<AdminActionResult<AdminListItem>> {
  const normalized = normalizeAdminInput(input);
  const validation = validateAdminInput(normalized);

  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    return { ok: false, message: firstError ?? "Datos inválidos." };
  }

  try {
    const adminClient = createAdminClient();

    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email: normalized.email,
        password: normalized.password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      return {
        ok: false,
        message: authError?.message ?? "No se pudo crear el usuario en Auth.",
      };
    }

    const userId = authData.user.id;
    const supabase = await createClient();

    const { error: profileError } = await supabase.from("profiles").insert({
      user_id: userId,
      first_names: normalized.first_names,
      last_names: normalized.last_names,
      user_role: "ADMIN_PLATFORM",
      user_is_active: true,
      attemps_left: 3,
    });

    if (profileError) {
      // Rollback: eliminar el usuario de Auth si el perfil falló.
      await adminClient.auth.admin.deleteUser(userId);
      return {
        ok: false,
        message: profileError.message ?? "No se pudo crear el perfil.",
      };
    }

    revalidatePath("/platform-admins");

    return {
      ok: true,
      message: "Administrador creado correctamente.",
      data: {
        user_id: userId,
        email: normalized.email,
        first_names: normalized.first_names,
        last_names: normalized.last_names,
        full_name: `${normalized.first_names} ${normalized.last_names}`.trim(),
        user_is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No fue posible crear el administrador.",
    };
  }
}

// Actualiza nombres, estado activo y opcionalmente la contraseña.
export async function updatePlatformAdmin(
  userId: string,
  input: AdminEditInput,
): Promise<AdminActionResult<AdminListItem>> {
  const normalized = normalizeAdminEditInput(input);
  const validation = validateAdminEditInput(normalized);

  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    return { ok: false, message: firstError ?? "Datos inválidos." };
  }

  try {
    const supabase = await createClient();

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        first_names: normalized.first_names,
        last_names: normalized.last_names,
        user_is_active: normalized.user_is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (profileError) {
      return { ok: false, message: profileError.message };
    }

    if (normalized.new_password) {
      const adminClient = createAdminClient();
      const { error: pwError } = await adminClient.auth.admin.updateUserById(
        userId,
        { password: normalized.new_password },
      );

      if (pwError) {
        return {
          ok: false,
          message: `Perfil actualizado pero no se pudo cambiar la contraseña: ${pwError.message}`,
        };
      }
    }

    revalidatePath("/platform-admins");

    return {
      ok: true,
      message: "Administrador actualizado correctamente.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No fue posible actualizar el administrador.",
    };
  }
}

// Desactiva el admin (soft): user_is_active = false.
export async function deactivatePlatformAdmin(
  userId: string,
): Promise<AdminActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        user_is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/platform-admins");
    return { ok: true, message: "Administrador desactivado correctamente." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No fue posible desactivar el administrador.",
    };
  }
}
