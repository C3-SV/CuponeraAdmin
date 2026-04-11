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

// Tipo para cliente de Supabase server-side
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Estructura de categoría desde Supabase (individual o en relación)
type CategoryRow = {
  category_id: string;
  category_name: string;
  deleted_at: string | null;
};

// Categoría puede venir como un objeto, arreglo o nulo desde Supabase
type CategoryRelation = CategoryRow | CategoryRow[] | null;

// Estructura de empresa con relación a categorías desde Supabase
type CompanyRow = {
  company_id: string;
  company_name: string;
  company_commission_rate: number;
  category_id: string | null;
  deleted_at: string | null;
  categories: CategoryRelation;
};

// Empresa puede venir como un objeto, arreglo o nulo desde Supabase
type CompanyRelation = CompanyRow | CompanyRow[] | null;

// Estructura de oferta con relaciones a empresas, categorías y órdenes de items
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
  }[];
};

// Parámetros por defecto para consultas de estadísticas de ofertas
const DEFAULT_QUERY: ApprovedOfferStatsQueryParams = {
  search: "",
  companyId: "",
  categoryId: "",
  sortBy: "offer_title",
  sortDir: "asc",
  page: 1,
  pageSize: 10,
};

// KPIs vacíos para retornar cuando hay errores o no hay datos
const EMPTY_KPIS: ApprovedOfferStatsKpis = {
  total_approved_offers: 0,
  total_sold_coupons: 0,
  total_revenue: 0,
  total_service_fee: 0,
  total_available_coupons_finite: 0,
  unlimited_offers_count: 0,
};

// Gráficos vacíos para retornar cuando hay errores o no hay datos
const EMPTY_CHARTS: ApprovedOfferStatsCharts = {
  top_revenue_offers: [],
  sold_vs_available: {
    sold: 0,
    available_finite: 0,
    unlimited_offers_count: 0,
  },
};

// Normaliza y protege los parámetros de consulta para evitar valores inválidos.
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

// Redondea un valor numérico a dos decimales para dinero.
function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

// Convierte un valor a número o retorna 0 si no es válido.
function toNumberOrZero(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Convierte un valor a número o retorna null si no es válido.
function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Genera un código corto de oferta en formato OFR-XXXXXXXX a partir del ID.
function shortOfferCode(offerId: string): string {
  return `OFR-${offerId.slice(0, 8).toUpperCase()}`;
}

// Extrae la empresa de una fila de oferta, manejando relación como objeto o arreglo.
function getCompanyFromOffer(row: OfferRow) {
  if (!row.companies) {
    return null;
  }

  if (Array.isArray(row.companies)) {
    return row.companies[0] ?? null;
  }

  return row.companies;
}

// Extrae la categoría de una empresa, manejo de relación como objeto o arreglo.
function getCategoryFromCompany(company: NonNullable<CompanyRelation>): CategoryRow | null {
  if (!company) {
    return null;
  }

  const companyRow = Array.isArray(company) ? company[0] : company;
  if (!companyRow?.categories) {
    return null;
  }

  return Array.isArray(companyRow.categories)
    ? companyRow.categories[0] ?? null
    : companyRow.categories;
}

// Construye la URL pública de icono de categoría si en BD solo hay path relativo.
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

// Compara dos valores de cupones disponibles (posiblemente null para ilimitado).
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

// Calcula KPIs agregados (totales) a partir de items procesados de ofertas.
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

// Construye datos de gráficos (top 5 ingresos y proporción vendido/disponible).
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

// Ordena items de ofertas por el campo y dirección especificada en parámetros.
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

// Carga los filtros dinámicos (Compañías y Categorías) para los selects del Dashboard.
// Retorna listas de empresas con ofertas aprobadas y categorías con iconos.
export async function listApprovedOfferStatsFilters(): Promise<ApprovedOfferStatsFilters> {
  try {
    const supabase = await createClient();

    // Obtiene ofertas aprobadas y categorías en paralelo para los filtros
    const [offersRes, categoriesRes] = await Promise.all([
      supabase
        .from("offers")
        .select(
          "company_id, companies(company_id, company_name, deleted_at, category_id, categories(category_id, category_name, deleted_at))",
        )
        .eq("offer_status", "APPROVED")
        .is("deleted_at", null),
      supabase
        .from("categories")
        .select("category_id, category_name, category_img")
        .is("deleted_at", null)
        .order("category_name", { ascending: true }),
    ]);

    if (offersRes.error) {
      return { companies: [], categories: [] };
    }

    // Extrae empresas únicas de las ofertas aprobadas
    const companyMap = new Map<string, { id: string; name: string }>();
    (offersRes.data as OfferRow[]).forEach((row) => {
      const company = getCompanyFromOffer(row);
      if (!company || company.deleted_at) {
        return;
      }
      companyMap.set(company.company_id, {
        id: company.company_id,
        name: company.company_name,
      });
    });

    // Mapea categorías y construye URLs de iconos
    const categories = (categoriesRes.data ?? []).map((category) => {
      const category_img = (category as { category_img: string | null }).category_img;
      return {
        id: (category as { category_id: string }).category_id,
        name: (category as { category_name: string }).category_name,
        icon_url: buildCategoryIconUrl(supabase, category_img),
      };
    });

    return {
      companies: [...companyMap.values()].sort((left, right) =>
        left.name.localeCompare(right.name, "es", { sensitivity: "base" }),
      ),
      categories: categories.sort((left, right) =>
        left.name.localeCompare(right.name, "es", { sensitivity: "base" }),
      ),
    };
  } catch {
    return { companies: [], categories: [] };
  }
}

// Carga y procesa estadísticas de ofertas aprobadas con filtros, búsqueda, ordenamiento y paginación.
// Calcula KPIs (ingresos, cupones vendidos, comisión) y gráficos.
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
    
    // Consulta ofertas aprobadas con relaciones a empresas, categorías y órdenes de items
    const { data: offersData, error: offersError } = await supabase
      .from("offers")
      .select(
        "offer_id, offer_title, offer_price, offer_start_date, offer_end_date, coupon_usage_deadline, coupon_quantity_limit, company_id, companies(company_id, company_name, company_commission_rate, category_id, deleted_at, categories(category_id, category_name, deleted_at)), order_items(quantity, deleted_at)",
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

    // Mapea filas de Supabase a estructura interna normalizada
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

    // Aplica filtros de búsqueda, empresa y categoría
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

    // Computa estadísticas de cada oferta: ingresos, comisión, cupones vendidos
    const computedItems: ApprovedOfferStatsItem[] = filteredOffers.map((offer) => {
      // Suma cantidad de cupones de order_items no eliminados
      const soldCoupons = offer.order_items
        .filter((oi) => oi.deleted_at == null)
        .reduce((acc, oi) => acc + oi.quantity, 0);
      // Calcula disponibles restando vendidos del límite
      const availableCoupons = Math.max(
        0,
        Number(offer.coupon_quantity_limit ?? 0) - soldCoupons,
      );
      // Calcula ingresos totales (precio × cupones vendidos)
      const totalRevenue = roundMoney(soldCoupons * offer.offer_price);
      // Calcula cargo por servicio basado en tasa de comisión de la empresa
      const serviceFee = roundMoney(totalRevenue * offer.company_commission_rate);

      return {
        offer_id: offer.offer_id,
        offer_title: offer.offer_title,
        offer_code: shortOfferCode(offer.offer_id),
        company_id: offer.company_id,
        company_name: offer.company_name,
        company_commission_rate: offer.company_commission_rate,
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

    // Ordena, calcula KPIs, construye gráficos y pagina resultados
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