"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAuthProfile } from "@/lib/auth";
import type {
  EmployeeActionResult,
  EmployeeDetail,
  EmployeeFormInput,
  EmployeeListItem,
  EmployeeQueryParams,
  EmployeesListResponse,
  EmployeeSortBy,
  SortDirection,
} from "@/lib/company-employees/types";
import {
  normalizeEmployeeInput,
  validateEmployeeInput,
} from "@/lib/company-employees/validation";
import { createAdminClient } from "@/lib/supabase/admin";

type EmployeeProfileRow = {
  user_id: string;
  first_names: string;
  last_names: string;
  user_role: "EMPLOYEE";
  user_is_active: boolean;
  company_id: string;
  created_at: string;
  updated_at: string;
};

const EMPLOYEE_SORT_FIELDS: EmployeeSortBy[] = [
  "first_names",
  "last_names",
  "user_is_active",
  "created_at",
];
const SORT_DIRECTIONS: SortDirection[] = ["asc", "desc"];

const DEFAULT_QUERY: EmployeeQueryParams = {
  search: "",
  status: "all",
  sortBy: "first_names",
  sortDir: "asc",
  page: 1,
  pageSize: 10,
};

async function getCompanyIdFromSession(): Promise<
  { ok: true; companyId: string } | { ok: false; message: string }
> {
  const profile = await getCurrentAuthProfile();

  if (!profile?.company_id) {
    return {
      ok: false,
      message: "No hay una empresa asociada al usuario actual.",
    };
  }

  return { ok: true, companyId: profile.company_id };
}

function normalizeQueryParams(
  params?: Partial<EmployeeQueryParams>,
): EmployeeQueryParams {
  const sortBy = EMPLOYEE_SORT_FIELDS.includes(params?.sortBy ?? DEFAULT_QUERY.sortBy)
    ? params?.sortBy ?? DEFAULT_QUERY.sortBy
    : DEFAULT_QUERY.sortBy;
  const sortDir = SORT_DIRECTIONS.includes(params?.sortDir ?? DEFAULT_QUERY.sortDir)
    ? params?.sortDir ?? DEFAULT_QUERY.sortDir
    : DEFAULT_QUERY.sortDir;
  const status =
    params?.status === "active" ||
    params?.status === "inactive" ||
    params?.status === "all"
      ? params.status
      : DEFAULT_QUERY.status;

  return {
    search: params?.search?.trim() ?? DEFAULT_QUERY.search,
    status,
    sortBy,
    sortDir,
    page: Number(params?.page ?? DEFAULT_QUERY.page) || DEFAULT_QUERY.page,
    pageSize: Math.min(
      50,
      Number(params?.pageSize ?? DEFAULT_QUERY.pageSize) || DEFAULT_QUERY.pageSize,
    ),
  };
}

function getSearchTerms(search: string): string[] {
  return search
    .split(/\s+/)
    .map((term) => term.replace(/[%,]/g, "").trim())
    .filter(Boolean)
    .slice(0, 5);
}

async function toEmployeeListItem(
  row: EmployeeProfileRow,
): Promise<EmployeeListItem> {
  let email = "";

  try {
    const supabaseAdmin = createAdminClient();
    const { data } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
    email = data.user?.email ?? "";
  } catch {
    email = "";
  }

  return {
    user_id: row.user_id,
    email,
    first_names: row.first_names,
    last_names: row.last_names,
    user_role: "EMPLOYEE",
    user_is_active: row.user_is_active,
    company_id: row.company_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getEmployeeProfileForCompany(
  userId: string,
  companyId: string,
): Promise<EmployeeProfileRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "user_id, first_names, last_names, user_role, user_is_active, company_id, created_at, updated_at",
    )
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .eq("user_role", "EMPLOYEE")
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as EmployeeProfileRow;
}

export async function listCompanyEmployees(
  rawParams?: Partial<EmployeeQueryParams>,
): Promise<EmployeesListResponse> {
  const params = normalizeQueryParams(rawParams);
  const pageSize = Math.max(1, params.pageSize);
  const page = Math.max(1, params.page);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const context = await getCompanyIdFromSession();

    if (!context.ok) {
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        error: context.message,
      };
    }

    const supabase = createAdminClient();
    let query = supabase
      .from("profiles")
      .select(
        "user_id, first_names, last_names, user_role, user_is_active, company_id, created_at, updated_at",
        { count: "exact" },
      )
      .eq("company_id", context.companyId)
      .eq("user_role", "EMPLOYEE")
      .is("deleted_at", null);

    if (params.status === "active") {
      query = query.eq("user_is_active", true);
    } else if (params.status === "inactive") {
      query = query.eq("user_is_active", false);
    }

    const searchTerms = getSearchTerms(params.search);
    for (const term of searchTerms) {
      query = query.or(
        `first_names.ilike.%${term}%,last_names.ilike.%${term}%`,
      );
    }

    const { data, count, error } = await query
      .order(params.sortBy, { ascending: params.sortDir === "asc" })
      .range(from, to);

    if (error) {
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        error: error.message,
      };
    }

    const employees = await Promise.all(
      ((data ?? []) as EmployeeProfileRow[]).map(toEmployeeListItem),
    );

    return {
      data: employees,
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
          : "No fue posible cargar empleados.",
    };
  }
}

export async function getCompanyEmployeeDetail(
  userId: string,
): Promise<EmployeeActionResult<EmployeeDetail>> {
  try {
    const context = await getCompanyIdFromSession();

    if (!context.ok) {
      return { ok: false, message: context.message };
    }

    const row = await getEmployeeProfileForCompany(userId, context.companyId);

    if (!row) {
      return {
        ok: false,
        message: "El empleado no existe o no pertenece a tu empresa.",
      };
    }

    return {
      ok: true,
      message: "Detalle cargado.",
      data: await toEmployeeListItem(row),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No fue posible obtener el empleado.",
    };
  }
}

export async function createCompanyEmployee(
  input: EmployeeFormInput,
): Promise<EmployeeActionResult<EmployeeDetail>> {
  const normalized = normalizeEmployeeInput(input);
  const validation = validateEmployeeInput(normalized, { mode: "create" });

  if (!validation.isValid) {
    return {
      ok: false,
      message: Object.values(validation.errors)[0] ?? "Datos invalidos.",
    };
  }

  try {
    const context = await getCompanyIdFromSession();

    if (!context.ok) {
      return { ok: false, message: context.message };
    }

    const supabaseAdmin = createAdminClient();
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalized.email,
        password: normalized.password,
        email_confirm: true,
        user_metadata: {
          first_names: normalized.first_names,
          last_names: normalized.last_names,
          user_role: "EMPLOYEE",
          company_id: context.companyId,
        },
      });

    if (authError || !authData.user) {
      return {
        ok: false,
        message: authError?.message ?? "No fue posible crear el usuario Auth.",
      };
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      user_id: authData.user.id,
      first_names: normalized.first_names,
      last_names: normalized.last_names,
      user_role: "EMPLOYEE",
      user_is_active: normalized.user_is_active,
      company_id: context.companyId,
    });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return {
        ok: false,
        message: profileError.message,
      };
    }

    const detailResult = await getCompanyEmployeeDetail(authData.user.id);
    revalidatePath("/company-employees");

    return {
      ok: true,
      message: "Empleado creado correctamente.",
      data: detailResult.data,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No fue posible crear el empleado.",
    };
  }
}

export async function updateCompanyEmployee(
  userId: string,
  input: EmployeeFormInput,
): Promise<EmployeeActionResult<EmployeeDetail>> {
  const normalized = normalizeEmployeeInput(input);
  const validation = validateEmployeeInput(normalized, { mode: "edit" });

  if (!validation.isValid) {
    return {
      ok: false,
      message: Object.values(validation.errors)[0] ?? "Datos invalidos.",
    };
  }

  try {
    const context = await getCompanyIdFromSession();

    if (!context.ok) {
      return { ok: false, message: context.message };
    }

    const existingEmployee = await getEmployeeProfileForCompany(
      userId,
      context.companyId,
    );

    if (!existingEmployee) {
      return {
        ok: false,
        message: "El empleado no existe o no pertenece a tu empresa.",
      };
    }

    const supabaseAdmin = createAdminClient();
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        email: normalized.email,
        ...(normalized.password ? { password: normalized.password } : {}),
        user_metadata: {
          first_names: normalized.first_names,
          last_names: normalized.last_names,
          user_role: "EMPLOYEE",
          company_id: context.companyId,
        },
      },
    );

    if (authError) {
      return {
        ok: false,
        message: authError.message,
      };
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        first_names: normalized.first_names,
        last_names: normalized.last_names,
        user_is_active: normalized.user_is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("company_id", context.companyId)
      .eq("user_role", "EMPLOYEE")
      .is("deleted_at", null);

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    const detailResult = await getCompanyEmployeeDetail(userId);
    revalidatePath("/company-employees");

    return {
      ok: true,
      message: "Empleado actualizado correctamente.",
      data: detailResult.data,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No fue posible actualizar el empleado.",
    };
  }
}

export async function softDeleteCompanyEmployee(
  userId: string,
): Promise<EmployeeActionResult> {
  try {
    const context = await getCompanyIdFromSession();

    if (!context.ok) {
      return { ok: false, message: context.message };
    }

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        user_is_active: false,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("company_id", context.companyId)
      .eq("user_role", "EMPLOYEE")
      .is("deleted_at", null);

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    revalidatePath("/company-employees");

    return {
      ok: true,
      message: "Empleado desactivado correctamente.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No fue posible desactivar el empleado.",
    };
  }
}
