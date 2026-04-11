"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  CustomerCoupon,
  CustomerCouponsResult,
  CustomerListItem,
  CustomerQueryParams,
  CustomersListResponse,
} from "@/lib/customers/types";

const DEFAULT_QUERY: CustomerQueryParams = {
  search: "",
  sortBy: "first_names",
  sortDir: "asc",
  page: 1,
  pageSize: 10,
};

function normalizeQueryParams(
  params?: Partial<CustomerQueryParams>,
): CustomerQueryParams {
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

// Obtiene emails de Auth para una lista de user_ids.
async function getAuthEmailsMap(
  userIds: string[],
): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};

  const adminClient = createAdminClient();
  const emailMap: Record<string, string> = {};

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

// Lista clientes con búsqueda, orden y paginación.
// Hace join con customer_profile para obtener dui/phone/address.
export async function listCustomers(
  rawParams?: Partial<CustomerQueryParams>,
): Promise<CustomersListResponse> {
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
        "user_id, first_names, last_names, user_is_active, created_at, customer_profile(dui, phone, address)",
        { count: "exact" },
      )
      .eq("user_role", "CUSTOMER")
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

    const rows = (data ?? []) as Array<{
      user_id: string;
      first_names: string;
      last_names: string;
      user_is_active: boolean;
      created_at: string;
      customer_profile:
        | { dui: string | null; phone: string | null; address: string | null }
        | Array<{ dui: string | null; phone: string | null; address: string | null }>
        | null;
    }>;

    const userIds = rows.map((r) => r.user_id);
    const emailMap = await getAuthEmailsMap(userIds);

    return {
      data: rows.map((row) => {
        const profile = Array.isArray(row.customer_profile)
          ? row.customer_profile[0] ?? null
          : row.customer_profile;

        return {
          user_id: row.user_id,
          email: emailMap[row.user_id] ?? "",
          first_names: row.first_names,
          last_names: row.last_names,
          full_name: `${row.first_names} ${row.last_names}`.trim(),
          dui: profile?.dui ?? null,
          phone: profile?.phone ?? null,
          address: profile?.address ?? null,
          user_is_active: row.user_is_active,
          created_at: row.created_at,
        } satisfies CustomerListItem;
      }),
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
      error: error instanceof Error ? error.message : "No fue posible cargar los clientes.",
    };
  }
}

// Carga los cupones de un cliente agrupables por estado en la UI.
// Cadena: coupons -> order_items -> offers -> companies
export async function getCustomerCoupons(
  userId: string,
): Promise<CustomerCouponsResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("coupons")
      .select(
        `coupon_id,
         coupon_code,
         coupon_status,
         coupon_expires_at,
         coupon_redeemed_at,
         order_items(
           offers(
             offer_title,
             offer_price,
             companies(company_name)
           )
         )`,
      )
      .eq("coupon_redeemed_by", userId)
      .is("deleted_at", null)
      .order("coupon_expires_at", { ascending: false });

    if (error) {
      return { ok: false, data: [], message: error.message };
    }

    type RawCoupon = {
      coupon_id: string;
      coupon_code: string;
      coupon_status: string;
      coupon_expires_at: string | null;
      coupon_redeemed_at: string | null;
      order_items: {
        offers: {
          offer_title: string;
          offer_price: number;
          companies: { company_name: string } | { company_name: string }[] | null;
        } | null;
      } | null;
    };

    const coupons: CustomerCoupon[] = ((data ?? []) as RawCoupon[]).map((row) => {
      const offer = row.order_items?.offers;
      const companies = offer?.companies;
      const companyName = Array.isArray(companies)
        ? (companies[0]?.company_name ?? "")
        : (companies?.company_name ?? "");

      return {
        coupon_id: row.coupon_id,
        coupon_code: row.coupon_code,
        coupon_status: row.coupon_status as CustomerCoupon["coupon_status"],
        coupon_expires_at: row.coupon_expires_at,
        coupon_redeemed_at: row.coupon_redeemed_at,
        offer_title: offer?.offer_title ?? "Oferta no disponible",
        offer_price: offer?.offer_price ?? 0,
        company_name: companyName,
      };
    });

    return { ok: true, data: coupons };
  } catch (error) {
    return {
      ok: false,
      data: [],
      message: error instanceof Error ? error.message : "No fue posible cargar los cupones.",
    };
  }
}
