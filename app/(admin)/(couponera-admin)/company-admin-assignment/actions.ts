"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type {
  AssignedAdminSummary,
  CompanyAdminActionResult,
  CompanyAdminAssignmentListItem,
  CompanyAdminAssignmentListResponse,
  CompanyAdminAssignmentQueryParams,
  CompanyAdminCreateInput,
  CompanyAdminDetail,
  CompanyAdminUpdateInput,
} from "@/lib/company-admin-assignment/types";
import {
  normalizeCompanyAdminCreateInput,
  normalizeCompanyAdminUpdateInput,
  validateCompanyAdminCreateInput,
  validateCompanyAdminUpdateInput,
} from "@/lib/company-admin-assignment/validation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Shape minima de company usada por esta feature.
type CompanyRow = {
  company_id: string;
  company_code: string;
  company_name: string;
};

// Shape de profile para resolver asignaciones y detalle.
type ProfileRow = {
  user_id: string;
  company_id: string | null;
  first_names: string;
  last_names: string;
  email?: string | null;
  user_role: string;
  user_is_active: boolean;
  created_at: string;
  updated_at: string;
};

const ADMIN_COMPANY_ROLE = "ADMIN_COMPANY";
const DEFAULT_QUERY: CompanyAdminAssignmentQueryParams = {
  search: "",
  sortBy: "company_name",
  sortDir: "asc",
  page: 1,
  pageSize: 10,
};

// Normaliza query params y aplica limites defensivos.
function normalizeQueryParams(
  params?: Partial<CompanyAdminAssignmentQueryParams>,
): CompanyAdminAssignmentQueryParams {
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

// Construye el resumen de admin que consume la UI.
function buildAdminSummary(profile: ProfileRow): AssignedAdminSummary {
  return {
    user_id: profile.user_id,
    first_names: profile.first_names,
    last_names: profile.last_names,
    full_name: `${profile.first_names} ${profile.last_names}`.trim(),
    email: profile.email ?? null,
    user_is_active: profile.user_is_active,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };
}

// Une datos de empresa + admin en una fila de tabla.
function toAssignmentRow(
  company: CompanyRow,
  admin: ProfileRow | null,
): CompanyAdminAssignmentListItem {
  return {
    company_id: company.company_id,
    company_code: company.company_code,
    company_name: company.company_name,
    assigned_admin: admin ? buildAdminSummary(admin) : null,
  };
}

// Ordena en memoria por nombre completo del admin asignado.
function sortByAssignedAdminName(
  data: CompanyAdminAssignmentListItem[],
  sortDir: CompanyAdminAssignmentQueryParams["sortDir"],
): CompanyAdminAssignmentListItem[] {
  const ascending = sortDir === "asc";
  const sorted = [...data].sort((left, right) => {
    const leftName = left.assigned_admin?.full_name ?? "";
    const rightName = right.assigned_admin?.full_name ?? "";
    const nameComparison = leftName.localeCompare(rightName, "es", {
      sensitivity: "base",
    });

    if (nameComparison === 0) {
      const tieBreak = left.company_name.localeCompare(right.company_name, "es", {
        sensitivity: "base",
      });
      return ascending ? tieBreak : -tieBreak;
    }

    return ascending ? nameComparison : -nameComparison;
  });

  return sorted;
}

// Resuelve admins por lote para la pagina actual o dataset completo.
async function getAdminMapForCompanies(
  supabase: SupabaseServerClient,
  companies: CompanyRow[],
): Promise<Map<string, ProfileRow>> {
  if (companies.length === 0) {
    return new Map();
  }

  const companyIds = companies.map((company) => company.company_id);
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "user_id, company_id, first_names, last_names, user_role, user_is_active, created_at, updated_at",
    )
    .eq("user_role", ADMIN_COMPANY_ROLE)
    .in("company_id", companyIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    return new Map();
  }

  const byCompanyId = new Map<string, ProfileRow>();
  for (const profile of (data ?? []) as ProfileRow[]) {
    if (profile.company_id && !byCompanyId.has(profile.company_id)) {
      byCompanyId.set(profile.company_id, profile);
    }
  }

  return byCompanyId;
}

// Devuelve el admin asociado a una empresa, si existe.
function resolveAssignedAdminForCompany(
  company: CompanyRow,
  byCompanyId: Map<string, ProfileRow>,
): ProfileRow | null {
  return byCompanyId.get(company.company_id) ?? null;
}

// Busca el admin vigente de una empresa para validar unicidad.
async function findAssignedAdminForCompany(
  supabase: SupabaseServerClient,
  company: CompanyRow,
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "user_id, company_id, first_names, last_names, user_role, user_is_active, created_at, updated_at",
    )
    .eq("user_role", ADMIN_COMPANY_ROLE)
    .eq("company_id", company.company_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error || !data?.length) {
    return null;
  }

  return data[0] as ProfileRow;
}

// Crea cliente admin para operaciones auth.* de servidor.
function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Obtiene email real desde auth.users (admin client o RPC fallback).
async function getAuthUserEmailById(userId: string): Promise<string | null> {
  const adminClient = createSupabaseAdminClient();
  if (adminClient) {
    const { data, error } = await adminClient.auth.admin.getUserById(userId);
    if (!error) {
      return data.user?.email ?? null;
    }
  }

  // Fallback sin service role: usa funcion SQL SECURITY DEFINER si existe.
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_auth_user_email", {
      target_user_id: userId,
    });
    if (error) {
      return null;
    }
    return typeof data === "string" ? data : null;
  } catch {
    return null;
  }
}

// Lista empresas con su admin asignado segun busqueda, orden y pagina.
export async function listCompanyAdminAssignments(
  rawParams?: Partial<CompanyAdminAssignmentQueryParams>,
): Promise<CompanyAdminAssignmentListResponse> {
  const params = normalizeQueryParams(rawParams);
  const pageSize = Math.max(1, params.pageSize);
  const page = Math.max(1, params.page);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const supabase = await createClient();
    let query = supabase
      .from("companies")
      .select("company_id, company_code, company_name", { count: "exact" })
      .is("deleted_at", null);

    if (params.search) {
      query = query.or(
        `company_name.ilike.%${params.search}%,company_code.ilike.%${params.search}%`,
      );
    }

    if (params.sortBy === "assigned_admin") {
      const { data, error } = await query.order("company_name", { ascending: true });

      if (error) {
        return {
          data: [],
          total: 0,
          page,
          pageSize,
          error: error.message,
        };
      }

      const allCompanies = (data ?? []) as CompanyRow[];
      const byCompanyId = await getAdminMapForCompanies(supabase, allCompanies);

      const merged = allCompanies.map((company) =>
        toAssignmentRow(company, resolveAssignedAdminForCompany(company, byCompanyId)),
      );
      const sorted = sortByAssignedAdminName(merged, params.sortDir);
      const paginated = sorted.slice(from, to + 1);

      return {
        data: paginated,
        total: sorted.length,
        page,
        pageSize,
      };
    }

    query = query.order(params.sortBy, { ascending: params.sortDir === "asc" });
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

    const companies = (data ?? []) as CompanyRow[];
    const byCompanyId = await getAdminMapForCompanies(supabase, companies);

    return {
      data: companies.map((company) =>
        toAssignmentRow(company, resolveAssignedAdminForCompany(company, byCompanyId)),
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
          : "No fue posible cargar asignaciones.",
    };
  }
}

// Devuelve detalle de una empresa y el admin actual (incluyendo correo).
export async function getCompanyAdminDetail(
  companyId: string,
): Promise<CompanyAdminActionResult<CompanyAdminDetail>> {
  try {
    const supabase = await createClient();
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("company_id, company_code, company_name")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .single();

    if (companyError || !company) {
      return {
        ok: false,
        message: "No fue posible obtener la empresa seleccionada.",
      };
    }

    const assignedAdmin = await findAssignedAdminForCompany(
      supabase,
      company as CompanyRow,
    );

    let adminWithEmail = assignedAdmin;
    if (assignedAdmin) {
      const email = await getAuthUserEmailById(assignedAdmin.user_id);
      adminWithEmail = {
        ...assignedAdmin,
        email,
      };
    }

    return {
      ok: true,
      message: "Detalle cargado.",
      data: toAssignmentRow(company as CompanyRow, adminWithEmail),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No fue posible cargar el detalle.",
    };
  }
}

// Crea usuario ADMIN_COMPANY y lo vincula a la empresa seleccionada.
export async function createCompanyAdmin(
  companyId: string,
  input: CompanyAdminCreateInput,
): Promise<CompanyAdminActionResult<CompanyAdminDetail>> {
  const normalized = normalizeCompanyAdminCreateInput(input);
  const validation = validateCompanyAdminCreateInput(normalized);

  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    return {
      ok: false,
      message: firstError ?? "Datos invalidos para crear administrador.",
    };
  }

  const adminClient = createSupabaseAdminClient();
  if (!adminClient) {
    return {
      ok: false,
      message:
        "No se encontro SUPABASE_SERVICE_ROLE_KEY. Configura la variable para crear usuarios.",
    };
  }

  try {
    const supabase = await createClient();
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("company_id, company_code, company_name")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .single();

    if (companyError || !company) {
      return {
        ok: false,
        message: "La empresa no existe o no esta disponible.",
      };
    }

    const existingAdmin = await findAssignedAdminForCompany(
      supabase,
      company as CompanyRow,
    );

    if (existingAdmin) {
      return {
        ok: false,
        message: "Esta empresa ya tiene administrador asignado.",
      };
    }

    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email: normalized.email,
        password: normalized.password,
        email_confirm: true,
        user_metadata: {
          first_names: normalized.first_names,
          last_names: normalized.last_names,
          // Compatibilidad con triggers legacy que esperan singular.
          first_name: normalized.first_names,
          last_name: normalized.last_names,
        },
        app_metadata: {
          user_role: ADMIN_COMPANY_ROLE,
          // Compatibilidad con triggers legacy mal implementados.
          first_names: normalized.first_names,
          last_names: normalized.last_names,
          first_name: normalized.first_names,
          last_name: normalized.last_names,
        },
      });

    const authUserId = authData?.user?.id;
    if (authError || !authUserId) {
      return {
        ok: false,
        message: authError?.message ?? "No se pudo crear el usuario de acceso.",
      };
    }

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        user_id: authUserId,
        first_names: normalized.first_names,
        last_names: normalized.last_names,
        user_role: ADMIN_COMPANY_ROLE,
        user_is_active: normalized.user_is_active,
        company_id: companyId,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (profileError) {
      await adminClient.auth.admin.deleteUser(authUserId);
      return {
        ok: false,
        message: profileError.message,
      };
    }

    // Mantiene una referencia rápida al admin asignado desde companies.
    const { error: companyLinkError } = await supabase
      .from("companies")
      .update({
        contact_id: authUserId,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .is("deleted_at", null);

    if (companyLinkError) {
      return {
        ok: false,
        message: "Se creo el administrador, pero fallo la vinculacion con la empresa.",
      };
    }

    const detail = await getCompanyAdminDetail(companyId);
    revalidatePath("/company-admin-assignment");

    return {
      ok: true,
      message: "Administrador de empresa creado correctamente.",
      data: detail.data,
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

// Actualiza datos del admin asignado tanto en auth como en profiles.
export async function updateCompanyAdmin(
  companyId: string,
  adminUserId: string,
  input: CompanyAdminUpdateInput,
): Promise<CompanyAdminActionResult<CompanyAdminDetail>> {
  const normalized = normalizeCompanyAdminUpdateInput(input);
  const validation = validateCompanyAdminUpdateInput(normalized);

  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    return {
      ok: false,
      message: firstError ?? "Datos invalidos para actualizar administrador.",
    };
  }

  try {
    const supabase = await createClient();
    const adminClient = createSupabaseAdminClient();
    if (!adminClient) {
      return {
        ok: false,
        message:
          "No se encontro SUPABASE_SERVICE_ROLE_KEY. Configura la variable para actualizar correos.",
      };
    }

    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
      adminUserId,
      {
        email: normalized.email,
        user_metadata: {
          first_names: normalized.first_names,
          last_names: normalized.last_names,
        },
      },
    );

    if (authUpdateError) {
      return {
        ok: false,
        message: authUpdateError.message,
      };
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        first_names: normalized.first_names,
        last_names: normalized.last_names,
        user_is_active: normalized.user_is_active,
        company_id: companyId,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", adminUserId)
      .is("deleted_at", null);

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    await supabase
      .from("companies")
      .update({
        contact_id: adminUserId,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .is("deleted_at", null);

    const detail = await getCompanyAdminDetail(companyId);
    revalidatePath("/company-admin-assignment");

    return {
      ok: true,
      message: "Administrador de empresa actualizado correctamente.",
      data: detail.data,
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

// Desasigna admin de empresa e inactiva su perfil para permitir reemplazo.
export async function removeCompanyAdmin(
  companyId: string,
  adminUserId: string,
): Promise<CompanyAdminActionResult> {
  try {
    const supabase = await createClient();

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({
        user_is_active: false,
        company_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", adminUserId)
      .eq("user_role", ADMIN_COMPANY_ROLE)
      .eq("company_id", companyId)
      .is("deleted_at", null);

    if (profileUpdateError) {
      return {
        ok: false,
        message: profileUpdateError.message,
      };
    }

    const { error: companyUpdateError } = await supabase
      .from("companies")
      .update({
        contact_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .is("deleted_at", null);

    if (companyUpdateError) {
      return {
        ok: false,
        message: companyUpdateError.message,
      };
    }

    revalidatePath("/company-admin-assignment");

    return {
      ok: true,
      message: "Administrador desasignado correctamente.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No fue posible desasignar al administrador.",
    };
  }
}
