"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  ApprovedOfferRevenueBar,
  ApprovedOfferStatsCharts,
  ApprovedOfferStatsFilters,
  ApprovedOfferStatsItem,
  ApprovedOfferStatsKpis,
  ApprovedOfferStatsQueryParams,
  ApprovedOfferStatsResponse,
} from "@/lib/approved-offers-stats/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type CategoryRelation =
  | {
      category_id: string;
      category_name: string;
      deleted_at: string | null;
    }
  | {
      category_id: string;
      category_name: string;
      deleted_at: string | null;
    }[]
  | null;

type CompanyRelation =
  | {
      company_id: string;
      company_name: string;
      company_commission_rate: number;
      category_id: string | null;
      deleted_at: string | null;
      categories: CategoryRelation;
    }
  | {
      company_id: string;
      company_name: string;
      company_commission_rate: number;
      category_id: string | null;
      deleted_at: string | null;
      categories: CategoryRelation;
    }[]
  | null;

type OfferRow = {
  offer_id: string;
  offer_title: string;
  offer_price: number;
  offer_start_date: string;
  offer_end_date: string;
  coupon_usage_deadline: string;
  coupon_quantity_limit: number | null;
  company_id: string | null;
  companies: CompanyRelation;
  order_items: {
    quantity: number;
    deleted_at: string | null;
    orders: {
      order_status: string;
      deleted_at: string | null;
    } | null;
  }[];
};

const DEFAULT_QUERY: ApprovedOfferStatsQueryParams = {
  search: "",
  companyId: "",
  categoryId: "",
  sortBy: "offer_title",
  sortDir: "asc",
  page: 1,
  pageSize: 10,
};

const EMPTY_KPIS: ApprovedOfferStatsKpis = {
  total_approved_offers: 0,
  total_sold_coupons: 0,
  total_revenue: 0,
  total_service_fee: 0,
  total_available_coupons_finite: 0,
  unlimited_offers_count: 0,
};

const EMPTY_CHARTS: ApprovedOfferStatsCharts = {
  top_revenue_offers: [],
  sold_vs_available: {
    sold: 0,
    available_finite: 0,
    unlimited_offers_count: 0,
  },
};

function normalizeQueryParams(
  params?: Partial<ApprovedOfferStatsQueryParams>,
): ApprovedOfferStatsQueryParams {
  return {
    search: params?.search?.trim() ?? DEFAULT_QUERY.search,
    companyId: params?.companyId?.trim() ?? DEFAULT_QUERY.companyId,
    categoryId: params?.categoryId?.trim() ?? DEFAULT_QUERY.categoryId,
    sortBy: params?.sortBy ?? DEFAULT_QUERY.sortBy,
    sortDir: params?.sortDir ?? DEFAULT_QUERY.sortDir,
    page: Math.max(1, Number(params?.page ?? DEFAULT_QUERY.page) || DEFAULT_QUERY.page),
    pageSize: Math.min(
      50,
      Math.max(
        1,
        Number(params?.pageSize ?? DEFAULT_QUERY.pageSize) || DEFAULT_QUERY.pageSize,
      ),
    ),
  };
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function toNumberOrZero(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function shortOfferCode(offerId: string): string {
  return `OFR-${offerId.slice(0, 8).toUpperCase()}`;
}

function getCompanyFromOffer(row: OfferRow) {
  if (!row.companies) {
    return null;
  }

  if (Array.isArray(row.companies)) {
    return row.companies[0] ?? null;
  }

  return row.companies;
}

function getCategoryFromCompany(company: NonNullable<CompanyRelation>) {
  if (!company.categories) {
    return null;
  }

  if (Array.isArray(company.categories)) {
    return company.categories[0] ?? null;
  }

  return company.categories;
}

function compareNullableAvailable(
  left: number | null,
  right: number | null,
  sortDir: "asc" | "desc",
): number {
  if (left === null && right === null) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }
  return sortDir === "asc" ? left - right : right - left;
}

function buildKpis(items: ApprovedOfferStatsItem[]): ApprovedOfferStatsKpis {
  const totals = items.reduce(
    (accumulator, item) => {
      accumulator.total_sold_coupons += item.sold_coupons;
      accumulator.total_revenue += item.total_revenue;
      accumulator.total_service_fee += item.service_fee;
      if (item.available_coupons === null) {
        accumulator.unlimited_offers_count += 1;
      } else {
        accumulator.total_available_coupons_finite += item.available_coupons;
      }
      return accumulator;
    },
    {
      total_sold_coupons: 0,
      total_revenue: 0,
      total_service_fee: 0,
      total_available_coupons_finite: 0,
      unlimited_offers_count: 0,
    },
  );

  return {
    total_approved_offers: items.length,
    total_sold_coupons: totals.total_sold_coupons,
    total_revenue: roundMoney(totals.total_revenue),
    total_service_fee: roundMoney(totals.total_service_fee),
    total_available_coupons_finite: totals.total_available_coupons_finite,
    unlimited_offers_count: totals.unlimited_offers_count,
  };
}

function buildCharts(items: ApprovedOfferStatsItem[], kpis: ApprovedOfferStatsKpis) {
  const top_revenue_offers: ApprovedOfferRevenueBar[] = [...items]
    .sort((left, right) => right.total_revenue - left.total_revenue)
    .slice(0, 5)
    .map((item) => ({
      offer_id: item.offer_id,
      offer_title: item.offer_title,
      total_revenue: item.total_revenue,
    }));

  return {
    top_revenue_offers,
    sold_vs_available: {
      sold: kpis.total_sold_coupons,
      available_finite: kpis.total_available_coupons_finite,
      unlimited_offers_count: kpis.unlimited_offers_count,
    },
  };
}

function sortItems(
  items: ApprovedOfferStatsItem[],
  params: ApprovedOfferStatsQueryParams,
): ApprovedOfferStatsItem[] {
  const sorted = [...items];
  const multiplier = params.sortDir === "asc" ? 1 : -1;

  sorted.sort((left, right) => {
    switch (params.sortBy) {
      case "offer_title":
        return (
          left.offer_title.localeCompare(right.offer_title, "es", {
            sensitivity: "base",
          }) * multiplier
        );
      case "company_name":
        return (
          left.company_name.localeCompare(right.company_name, "es", {
            sensitivity: "base",
          }) * multiplier
        );
      case "offer_price":
        return (left.offer_price - right.offer_price) * multiplier;
      case "sold_coupons":
        return (left.sold_coupons - right.sold_coupons) * multiplier;
      case "available_coupons":
        return compareNullableAvailable(
          left.available_coupons,
          right.available_coupons,
          params.sortDir,
        );
      case "total_revenue":
        return (left.total_revenue - right.total_revenue) * multiplier;
      case "service_fee":
        return (left.service_fee - right.service_fee) * multiplier;
      case "offer_start_date":
        return (
          (Date.parse(left.offer_start_date) - Date.parse(right.offer_start_date)) *
          multiplier
        );
      case "offer_end_date":
        return (
          (Date.parse(left.offer_end_date) - Date.parse(right.offer_end_date)) *
          multiplier
        );
      case "coupon_usage_deadline":
        return (
          (Date.parse(left.coupon_usage_deadline) -
            Date.parse(right.coupon_usage_deadline)) *
          multiplier
        );
      default:
        return 0;
    }
  });

  return sorted;
}

export async function listApprovedOfferStatsFilters(): Promise<ApprovedOfferStatsFilters> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("offers")
      .select(
        "company_id, companies(company_id, company_name, deleted_at, category_id, categories(category_id, category_name, deleted_at))",
      )
      .eq("offer_status", "APPROVED")
      .is("deleted_at", null);

    if (error || !data?.length) {
      return { companies: [], categories: [] };
    }

    const companyMap = new Map<string, { id: string; name: string }>();
    const categoryMap = new Map<string, { id: string; name: string }>();

    (data as OfferRow[]).forEach((row) => {
      const company = getCompanyFromOffer(row);
      if (!company || company.deleted_at) {
        return;
      }
      companyMap.set(company.company_id, {
        id: company.company_id,
        name: company.company_name,
      });

      const category = getCategoryFromCompany(company);
      if (category && !category.deleted_at) {
        categoryMap.set(category.category_id, {
          id: category.category_id,
          name: category.category_name,
        });
      }
    });

    return {
      companies: [...companyMap.values()].sort((left, right) =>
        left.name.localeCompare(right.name, "es", { sensitivity: "base" }),
      ),
      categories: [...categoryMap.values()].sort((left, right) =>
        left.name.localeCompare(right.name, "es", { sensitivity: "base" }),
      ),
    };
  } catch {
    return { companies: [], categories: [] };
  }
}

export async function listApprovedOfferStats(
  rawParams?: Partial<ApprovedOfferStatsQueryParams>,
): Promise<ApprovedOfferStatsResponse> {
  const params = normalizeQueryParams(rawParams);
  const pageSize = params.pageSize;
  const page = params.page;
  const from = (page - 1) * pageSize;
  const to = from + pageSize;

  try {
    const supabase = await createClient();
    const { data: offersData, error: offersError } = await supabase
      .from("offers")
      .select(
        "offer_id, offer_title, offer_price, offer_start_date, offer_end_date, coupon_usage_deadline, coupon_quantity_limit, company_id, companies(company_id, company_name, company_commission_rate, category_id, deleted_at, categories(category_id, category_name, deleted_at)), order_items(quantity, deleted_at, orders(order_status, deleted_at))",
      )
      .eq("offer_status", "APPROVED")
      .is("deleted_at", null);

    if (offersError) {
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        kpis: EMPTY_KPIS,
        charts: EMPTY_CHARTS,
        error: offersError.message,
      };
    }

    const baseOffers = (offersData ?? [])
      .map((row) => {
        const offer = row as OfferRow;
        const company = getCompanyFromOffer(offer);
        if (!company || company.deleted_at) {
          return null;
        }
        const category = getCategoryFromCompany(company);
        const categoryValid = category && !category.deleted_at ? category : null;

        return {
          offer_id: offer.offer_id,
          offer_title: offer.offer_title,
          offer_price: toNumberOrZero(offer.offer_price),
          offer_start_date: offer.offer_start_date,
          offer_end_date: offer.offer_end_date,
          coupon_usage_deadline: offer.coupon_usage_deadline,
          coupon_quantity_limit: toNumberOrNull(offer.coupon_quantity_limit),
          company_id: company.company_id,
          company_name: company.company_name,
          company_commission_rate: toNumberOrZero(company.company_commission_rate),
          category_id: categoryValid?.category_id ?? null,
          category_name: categoryValid?.category_name ?? null,
          order_items: offer.order_items || [],
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const searchTerm = params.search.trim().toLowerCase();
    const filteredOffers = baseOffers.filter((offer) => {
      const matchesSearch =
        searchTerm.length === 0 ||
        offer.offer_title.toLowerCase().includes(searchTerm) ||
        offer.company_name.toLowerCase().includes(searchTerm);

      const matchesCompany =
        params.companyId.length === 0 || offer.company_id === params.companyId;

      const matchesCategory =
        params.categoryId.length === 0 || offer.category_id === params.categoryId;

      return matchesSearch && matchesCompany && matchesCategory;
    });

    const computedItems: ApprovedOfferStatsItem[] = filteredOffers.map((offer) => {
      const soldCoupons = offer.order_items.filter(oi => oi.deleted_at == null && oi.orders?.deleted_at == null && oi.orders?.order_status === 'COMPLETED').reduce((acc, oi) => acc + oi.quantity, 0);
      const availableCoupons =
        offer.coupon_quantity_limit === null
          ? null
          : Math.max(offer.coupon_quantity_limit - soldCoupons, 0);
      const totalRevenue = roundMoney(soldCoupons * offer.offer_price);
      const serviceFee = roundMoney(totalRevenue * offer.company_commission_rate);

      return {
        offer_id: offer.offer_id,
        offer_title: offer.offer_title,
        offer_code: shortOfferCode(offer.offer_id),
        company_id: offer.company_id,
        company_name: offer.company_name,
        category_id: offer.category_id,
        category_name: offer.category_name,
        offer_price: offer.offer_price,
        offer_start_date: offer.offer_start_date,
        offer_end_date: offer.offer_end_date,
        coupon_usage_deadline: offer.coupon_usage_deadline,
        coupon_quantity_limit: offer.coupon_quantity_limit,
        sold_coupons: soldCoupons,
        available_coupons: availableCoupons,
        total_revenue: totalRevenue,
        service_fee: serviceFee,
      };
    });

    const sortedItems = sortItems(computedItems, params);
    const kpis = buildKpis(sortedItems);
    const charts = buildCharts(sortedItems, kpis);
    const paginated = sortedItems.slice(from, to);

    return {
      data: paginated,
      total: sortedItems.length,
      page,
      pageSize,
      kpis,
      charts,
    };
  } catch (error) {
    return {
      data: [],
      total: 0,
      page,
      pageSize,
      kpis: EMPTY_KPIS,
      charts: EMPTY_CHARTS,
      error:
        error instanceof Error
          ? error.message
          : "No fue posible cargar estadisticas de ofertas aprobadas.",
    };
  }
}

/*"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  ApprovedOfferStatsFilters,
  ApprovedOfferStatsItem,
  ApprovedOfferStatsQueryParams,
  ApprovedOfferStatsResponse,
} from "@/lib/approved-offers-stats/types";

// Mapeo y protección de parámetros de búsqueda y paginación
function normalizeQueryParams(
  params?: Partial<ApprovedOfferStatsQueryParams>
): ApprovedOfferStatsQueryParams {
  return {
    search: params?.search?.trim() ?? "",
    companyId: params?.companyId ?? "",
    categoryId: params?.categoryId ?? "",
    sortBy: params?.sortBy ?? "offer_title",
    sortDir: params?.sortDir ?? "asc",
    page: Number(params?.page ?? 1) || 1,
    pageSize: Math.min(50, Number(params?.pageSize ?? 10) || 10),
  };
}

// Carga los filtros dinámicos (Compañías y Categorías) para los selects del Dashboard
export async function listApprovedOfferStatsFilters(): Promise<ApprovedOfferStatsFilters> {
  const supabase = await createClient();

  const [companiesRes, categoriesRes] = await Promise.all([
    supabase.from("companies").select("company_id, company_name").is("deleted_at", null).order("company_name"),
    supabase.from("categories").select("category_id, category_name").is("deleted_at", null).order("category_name"),
  ]);

  return {
    companies: (companiesRes.data ?? []).map((c) => ({ id: c.company_id, name: c.company_name })),
    categories: (categoriesRes.data ?? []).map((c) => ({ id: c.category_id, name: c.category_name })),
  };
}

// Carga las ofertas, cruza las tablas y procesa las estadísticas requeridas por la UI
export async function listApprovedOfferStats(
  rawParams?: Partial<ApprovedOfferStatsQueryParams>
): Promise<ApprovedOfferStatsResponse> {
  const params = normalizeQueryParams(rawParams);
  const supabase = await createClient();

  try {
    // Consultamos las ofertas, cruzamos con categories/companies
    // y anidamos order_items junto con su respectiva order para verificar el status
    let query = supabase
      .from("offers")
      .select(`
        offer_id,
        offer_title,
        offer_price,
        offer_start_date,
        offer_end_date,
        coupon_usage_deadline,
        coupon_quantity_limit,
        companies!inner (
          company_id,
          company_name,
          company_commission_rate,
          categories!inner (
            category_id,
            category_name
          )
        ),
        order_items (
          quantity
        )
      `)
      .eq("offer_status", "APPROVED") // Aseguramos que solo cuente las ofertas aprobadas
      .is("deleted_at", null);

    // Aplicamos filtros directos a la consulta
    if (params.search) {
      query = query.ilike("offer_title", `%${params.search}%`);
    }
    if (params.companyId) {
      query = query.eq("company_id", params.companyId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    let offers = (data as any[]) || [];

    // Filtro de categoría en memoria (para evitar limitantes de PostgREST con relaciones profundas)
    if (params.categoryId) {
      offers = offers.filter((o) => {
        const cat = Array.isArray(o.companies?.categories) ? o.companies.categories[0] : o.companies?.categories;
        return cat?.category_id === params.categoryId;
      });
    }

    // Procesamiento de cálculos y métricas por cada Oferta
    let processedItems: ApprovedOfferStatsItem[] = offers.map((offer) => {
      const company = Array.isArray(offer.companies) ? offer.companies[0] : offer.companies;
      const category = Array.isArray(company?.categories) ? company?.categories[0] : company?.categories;
      
      // Calcular la cantidad de cupones vendidos sumando las cantidades en las órdenes
      const orderItems = offer.order_items || [];
      const soldCoupons = orderItems.reduce((acc: number, curr: any) => acc + Number(curr.quantity), 0);
      
      // Ingresos: Precio de oferta * cantidad de cupones vendidos
      const totalRevenue = soldCoupons * Number(offer.offer_price);
      
      // Cargo por servicio basado en la tasa de comisión de la empresa
      const commissionRate = Number(company?.company_commission_rate || 0);
      const serviceFee = totalRevenue * (commissionRate / 100);

      // Cupones disponibles
      const availableCoupons =
        offer.coupon_quantity_limit !== null
          ? Math.max(0, Number(offer.coupon_quantity_limit) - soldCoupons)
          : null; // Null es ilimitado

      return {
        offer_id: offer.offer_id,
        offer_title: offer.offer_title,
        company_name: company?.company_name ?? "Sin Empresa",
        category_name: category?.category_name ?? null,
        offer_price: Number(offer.offer_price),
        sold_coupons: soldCoupons,
        available_coupons: availableCoupons,
        total_revenue: totalRevenue,
        service_fee: serviceFee,
        offer_start_date: offer.offer_start_date,
        offer_end_date: offer.offer_end_date,
        coupon_usage_deadline: offer.coupon_usage_deadline,
      };
    });

    // Ordenamiento Dinámico en memoria (permite ordenar sobre las columnas calculadas)
    processedItems.sort((a, b) => {
      const field = params.sortBy as keyof ApprovedOfferStatsItem;
      let valA = a[field] ?? "";
      let valB = b[field] ?? "";

      if (valA < valB) return params.sortDir === "asc" ? -1 : 1;
      if (valA > valB) return params.sortDir === "asc" ? 1 : -1;
      return 0;
    });

    // Paginación
    const total = processedItems.length;
    const from = (params.page - 1) * params.pageSize;
    const to = from + params.pageSize;
    const paginatedItems = processedItems.slice(from, to);

    // Cálculos de KPIs y gráficos globales para los KPIs de la parte superior
    const totalSoldCoupons = processedItems.reduce((acc, curr) => acc + curr.sold_coupons, 0);
    const totalRevenue = processedItems.reduce((acc, curr) => acc + curr.total_revenue, 0);
    const totalServiceFee = processedItems.reduce((acc, curr) => acc + curr.service_fee, 0);
    const unlimitedOffersCount = processedItems.filter((o) => o.available_coupons === null).length;
    const availableFinite = processedItems.reduce((acc, curr) => acc + (curr.available_coupons || 0), 0);

    const topRevenueOffers = [...processedItems]
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 5) // Top 5 ofertas por ingreso
      .map((o) => ({ offer_id: o.offer_id, offer_title: o.offer_title, total_revenue: o.total_revenue }));

    return {
      data: paginatedItems, total, page: params.page, pageSize: params.pageSize,
      kpis: { total_approved_offers: total, total_sold_coupons: totalSoldCoupons, total_revenue: totalRevenue, total_service_fee: totalServiceFee, unlimited_offers_count: unlimitedOffersCount },
      charts: { top_revenue_offers: topRevenueOffers, sold_vs_available: { sold: totalSoldCoupons, available_finite: availableFinite, unlimited_offers_count: unlimitedOffersCount } },
    };
  } catch (error) {
    return { data: [], total: 0, page: params.page, pageSize: params.pageSize, error: error instanceof Error ? error.message : "Error al cargar las estadísticas.", kpis: { total_approved_offers: 0, total_sold_coupons: 0, total_revenue: 0, total_service_fee: 0, unlimited_offers_count: 0 }, charts: { top_revenue_offers: [], sold_vs_available: { sold: 0, available_finite: 0, unlimited_offers_count: 0 } } };
  }
}
*/