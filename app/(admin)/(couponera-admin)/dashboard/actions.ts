"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  AdminPlatformDashboardData,
  DashboardKpis,
  DashboardLeaderboardItem,
  DashboardPerformance,
  DashboardTrendPoint,
} from "@/lib/dashboard/types";

// Shape base de empresa para joins de ofertas aprobadas.
type CompanyRow = {
  company_id: string;
  company_name: string;
  company_commission_rate: number;
  deleted_at: string | null;
  categories:
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
};

// Shape de oferta con relacion de empresa/categoria para metricas comerciales.
type OfferRow = {
  offer_id: string;
  offer_title: string;
  offer_price: number;
  offer_start_date: string;
  offer_end_date: string;
  coupon_usage_deadline: string;
  coupon_quantity_limit: number | null;
  companies: CompanyRow | CompanyRow[] | null;
};

// Shape minimo de item de orden para mapear ventas por oferta.
type OrderItemRow = {
  order_item_id: string;
  offer_id: string;
};

// Shape minimo de cupon emitido para conteos y series temporales.
type CouponRow = {
  order_item_id: string;
  coupon_issued_at: string;
};

// Estructura interna para resolver categoria con fallback.
type CategoryInfo = {
  id: string;
  name: string;
};

// Acumulador reusable para construir rankings de ingresos.
type RevenueAccumulator = {
  id: string;
  label: string;
  revenue: number;
};

const APPROVED_STATUS = "APPROVED";
const PENDING_STATUS = "PENDING";

// Estandariza redondeo monetario para evitar decimales flotantes en UI.
function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

// Convierte a numero de forma segura; fallback defensivo a 0.
function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Calcula variacion porcentual (current vs previous) con manejo de division por cero.
function calculateVariationPercent(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

// Obtiene la empresa relacionada sin importar si Supabase retorna objeto o arreglo.
function getCompany(offer: OfferRow): CompanyRow | null {
  if (!offer.companies) {
    return null;
  }
  if (Array.isArray(offer.companies)) {
    return offer.companies[0] ?? null;
  }
  return offer.companies;
}

// Resuelve categoria visible y aplica fallback para relaciones nulas/eliminadas.
function getCategoryInfo(company: CompanyRow | null): CategoryInfo {
  if (!company?.categories) {
    return { id: "uncategorized", name: "Sin categoria" };
  }

  const category = Array.isArray(company.categories)
    ? company.categories[0]
    : company.categories;

  if (!category || category.deleted_at) {
    return { id: "uncategorized", name: "Sin categoria" };
  }

  return { id: category.category_id, name: category.category_name };
}

// Normaliza fecha a medianoche para comparaciones estables por dia.
function normalizeDate(dateISO: string): Date {
  const date = new Date(dateISO);
  date.setHours(0, 0, 0, 0);
  return date;
}

// Serializa fecha en formato YYYY-MM-DD para llaves de mapa.
function dateOnlyISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Completa 30 puntos diarios incluso cuando no hay ventas en ciertos dias.
function buildTrendRows(
  start: Date,
  trendMap: Map<string, { sold: number; revenue: number }>,
): DashboardTrendPoint[] {
  const rows: DashboardTrendPoint[] = [];
  for (let day = 0; day < 30; day += 1) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + day);
    const dateKey = dateOnlyISO(currentDate);
    const current = trendMap.get(dateKey) ?? { sold: 0, revenue: 0 };
    rows.push({
      date: dateKey,
      sold_coupons: current.sold,
      revenue: roundMoney(current.revenue),
    });
  }
  return rows;
}

// Genera ranking ordenado por revenue y limita cantidad de filas.
function buildTopRevenue(
  values: RevenueAccumulator[],
  limit = 5,
): DashboardLeaderboardItem[] {
  return values
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      label: item.label,
      revenue: roundMoney(item.revenue),
    }));
}

// Respuesta segura para estados vacios o errores de consulta.
function buildEmptyDashboard(error?: string): AdminPlatformDashboardData {
  const kpis: DashboardKpis = {
    approved_offers: 0,
    pending_offers: 0,
    active_companies: 0,
    total_revenue: 0,
    total_service_fee: 0,
    active_internal_accounts: 0,
  };

  const performance: DashboardPerformance = {
    top_company_name: "Sin datos",
    top_company_revenue: 0,
    top_category_name: "Sin datos",
    top_category_revenue: 0,
    top_offer_title: "Sin datos",
    top_offer_sold: 0,
    trend_last_30_days: [],
    sold_last_30_days: 0,
    sold_previous_30_days: 0,
    revenue_last_30_days: 0,
    revenue_previous_30_days: 0,
    sold_variation_pct: 0,
    revenue_variation_pct: 0,
    avg_ticket_per_coupon: 0,
    avg_revenue_per_approved_offer: 0,
    top_companies_by_revenue: [],
    top_categories_by_revenue: [],
    top_offers_by_revenue: [],
  };

  return { kpis, performance, error };
}

// Action principal del dashboard general admin cuponera.
export async function listAdminPlatformDashboardData(): Promise<AdminPlatformDashboardData> {
  try {
    const supabase = await createClient();
    // Ventanas temporales para comparativa 30d actual vs 30d previos.
    const today = normalizeDate(new Date().toISOString());
    const todayISO = dateOnlyISO(today);

    const trendStart = new Date(today);
    trendStart.setDate(trendStart.getDate() - 29);
    const trendStartISO = dateOnlyISO(trendStart);

    const previousTrendStart = new Date(today);
    previousTrendStart.setDate(previousTrendStart.getDate() - 59);
    const previousTrendStartISO = dateOnlyISO(previousTrendStart);

    const previousTrendEnd = new Date(today);
    previousTrendEnd.setDate(previousTrendEnd.getDate() - 30);
    const previousTrendEndISO = dateOnlyISO(previousTrendEnd);

    const [approvedOffersRes, pendingOffersCountRes, companiesCountRes, profilesCountRes] =
      await Promise.all([
        // Dataset base de negocio: ofertas aprobadas activas.
        supabase
          .from("offers")
          .select(
            "offer_id, offer_title, offer_price, offer_start_date, offer_end_date, coupon_usage_deadline, coupon_quantity_limit, companies(company_id, company_name, company_commission_rate, deleted_at, categories(category_id, category_name, deleted_at))",
          )
          .eq("offer_status", APPROVED_STATUS)
          .is("deleted_at", null),
        supabase
          .from("offers")
          .select("offer_id", { count: "exact", head: true })
          .eq("offer_status", PENDING_STATUS)
          .is("deleted_at", null),
        supabase
          .from("companies")
          .select("company_id", { count: "exact", head: true })
          .is("deleted_at", null),
        supabase
          .from("profiles")
          .select("user_id", { count: "exact", head: true })
          .in("user_role", ["ADMIN_PLATFORM", "ADMIN_COMPANY"])
          .eq("user_is_active", true)
          .is("deleted_at", null),
      ]);

    if (approvedOffersRes.error) {
      return buildEmptyDashboard(approvedOffersRes.error.message);
    }
    if (pendingOffersCountRes.error) {
      return buildEmptyDashboard(pendingOffersCountRes.error.message);
    }

    const approvedOffers = (approvedOffersRes.data ?? []) as OfferRow[];
    const approvedOfferIds = approvedOffers.map((offer) => offer.offer_id);

    // Mapas base para consolidar ventas por oferta y por dia.
    const soldCouponsByOffer = new Map<string, number>();
    const trendMap = new Map<string, { sold: number; revenue: number }>();

    let soldLast30Days = 0;
    let soldPrevious30Days = 0;
    let revenueLast30Days = 0;
    let revenuePrevious30Days = 0;

    if (approvedOfferIds.length > 0) {
      const orderItemsRes = await supabase
        .from("order_items")
        .select("order_item_id, offer_id")
        .in("offer_id", approvedOfferIds)
        .is("deleted_at", null);

      if (orderItemsRes.error) {
        return buildEmptyDashboard(orderItemsRes.error.message);
      }

      const orderItems = (orderItemsRes.data ?? []) as OrderItemRow[];
      const orderItemIds = orderItems.map((row) => row.order_item_id);
      const offerByOrderItem = new Map<string, string>();
      const offerPriceMap = new Map<string, number>();

      orderItems.forEach((row) => {
        offerByOrderItem.set(row.order_item_id, row.offer_id);
      });

      approvedOffers.forEach((offer) => {
        offerPriceMap.set(offer.offer_id, toNumber(offer.offer_price));
      });

      if (orderItemIds.length > 0) {
        const couponsRes = await supabase
          .from("coupons")
          .select("order_item_id, coupon_issued_at")
          .in("order_item_id", orderItemIds)
          .is("deleted_at", null);

        if (couponsRes.error) {
          return buildEmptyDashboard(couponsRes.error.message);
        }

        const coupons = (couponsRes.data ?? []) as CouponRow[];
        // Recorre cupones emitidos para poblar conteos y tendencia diaria.
        coupons.forEach((coupon) => {
          const offerId = offerByOrderItem.get(coupon.order_item_id);
          if (!offerId) {
            return;
          }

          soldCouponsByOffer.set(offerId, (soldCouponsByOffer.get(offerId) ?? 0) + 1);

          const issuedDate = coupon.coupon_issued_at?.slice(0, 10);
          if (!issuedDate) {
            return;
          }

          const couponPrice = offerPriceMap.get(offerId) ?? 0;

          if (issuedDate >= trendStartISO && issuedDate <= todayISO) {
            soldLast30Days += 1;
            revenueLast30Days += couponPrice;

            const current = trendMap.get(issuedDate) ?? { sold: 0, revenue: 0 };
            current.sold += 1;
            current.revenue += couponPrice;
            trendMap.set(issuedDate, current);
            return;
          }

          if (issuedDate >= previousTrendStartISO && issuedDate <= previousTrendEndISO) {
            soldPrevious30Days += 1;
            revenuePrevious30Days += couponPrice;
          }
        });
      }
    }

    const trendRows = buildTrendRows(trendStart, trendMap);

    // Acumuladores para rankings de empresas/categorias.
    const companyRevenueMap = new Map<string, RevenueAccumulator>();
    const categoryRevenueMap = new Map<string, RevenueAccumulator>();

    let totalRevenue = 0;
    let totalServiceFee = 0;
    let topOfferTitle = "Sin datos";
    let topOfferSold = 0;

    // Calcula metricas por oferta y alimenta acumuladores globales.
    const offerRevenueRows: DashboardLeaderboardItem[] = approvedOffers.map((offer) => {
      const company = getCompany(offer);
      const soldCoupons = soldCouponsByOffer.get(offer.offer_id) ?? 0;
      const price = toNumber(offer.offer_price);
      const revenue = soldCoupons * price;

      if (company && !company.deleted_at) {
        const commissionRate = toNumber(company.company_commission_rate);
        totalRevenue += revenue;
        totalServiceFee += revenue * commissionRate;

        const companyCurrent = companyRevenueMap.get(company.company_id) ?? {
          id: company.company_id,
          label: company.company_name,
          revenue: 0,
        };
        companyCurrent.revenue += revenue;
        companyRevenueMap.set(company.company_id, companyCurrent);

        const category = getCategoryInfo(company);
        const categoryCurrent = categoryRevenueMap.get(category.id) ?? {
          id: category.id,
          label: category.name,
          revenue: 0,
        };
        categoryCurrent.revenue += revenue;
        categoryRevenueMap.set(category.id, categoryCurrent);
      }

      if (soldCoupons > topOfferSold) {
        topOfferSold = soldCoupons;
        topOfferTitle = offer.offer_title;
      }

      return {
        id: offer.offer_id,
        label: offer.offer_title,
        revenue: roundMoney(revenue),
        sold_coupons: soldCoupons,
      };
    });

    const totalSoldCoupons = approvedOffers.reduce(
      (total, offer) => total + (soldCouponsByOffer.get(offer.offer_id) ?? 0),
      0,
    );

    const topCompaniesByRevenue = buildTopRevenue([...companyRevenueMap.values()]);
    const topCategoriesByRevenue = buildTopRevenue([...categoryRevenueMap.values()]);
    const topOffersByRevenue = [...offerRevenueRows]
      .sort((left, right) => {
        if (right.revenue === left.revenue) {
          return (right.sold_coupons ?? 0) - (left.sold_coupons ?? 0);
        }
        return right.revenue - left.revenue;
      })
      .slice(0, 5);

    const topCompany = topCompaniesByRevenue[0] ?? {
      id: "none-company",
      label: "Sin datos",
      revenue: 0,
    };
    const topCategory = topCategoriesByRevenue[0] ?? {
      id: "none-category",
      label: "Sin datos",
      revenue: 0,
    };

    // KPI globales para cards superiores.
    const kpis: DashboardKpis = {
      approved_offers: approvedOffers.length,
      pending_offers: pendingOffersCountRes.count ?? 0,
      active_companies: companiesCountRes.count ?? 0,
      total_revenue: roundMoney(totalRevenue),
      total_service_fee: roundMoney(totalServiceFee),
      active_internal_accounts: profilesCountRes.count ?? 0,
    };

    // Bloque de rendimiento comercial y comparativos.
    const performance: DashboardPerformance = {
      top_company_name: topCompany.label,
      top_company_revenue: topCompany.revenue,
      top_category_name: topCategory.label,
      top_category_revenue: topCategory.revenue,
      top_offer_title: topOfferTitle,
      top_offer_sold: topOfferSold,
      trend_last_30_days: trendRows,
      sold_last_30_days: soldLast30Days,
      sold_previous_30_days: soldPrevious30Days,
      revenue_last_30_days: roundMoney(revenueLast30Days),
      revenue_previous_30_days: roundMoney(revenuePrevious30Days),
      sold_variation_pct: calculateVariationPercent(soldLast30Days, soldPrevious30Days),
      revenue_variation_pct: calculateVariationPercent(revenueLast30Days, revenuePrevious30Days),
      avg_ticket_per_coupon:
        totalSoldCoupons > 0 ? roundMoney(totalRevenue / totalSoldCoupons) : 0,
      avg_revenue_per_approved_offer:
        approvedOffers.length > 0 ? roundMoney(totalRevenue / approvedOffers.length) : 0,
      top_companies_by_revenue: topCompaniesByRevenue,
      top_categories_by_revenue: topCategoriesByRevenue,
      top_offers_by_revenue: topOffersByRevenue,
    };

    return {
      kpis,
      performance,
    };
  } catch (error) {
    // Fallback final para asegurar render estable del modulo.
    return buildEmptyDashboard(
      error instanceof Error ? error.message : "No fue posible cargar el dashboard.",
    );
  }
}
