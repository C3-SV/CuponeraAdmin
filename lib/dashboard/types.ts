// Indicadores principales del dashboard ejecutivo.
export type DashboardKpis = {
  approved_offers: number;
  pending_offers: number;
  active_companies: number;
  total_revenue: number;
  total_service_fee: number;
  active_internal_accounts: number;
};

// Punto diario para la mini serie temporal de rendimiento.
export type DashboardTrendPoint = {
  date: string;
  sold_coupons: number;
  revenue: number;
};

// Item de ranking para tablas top por ingresos.
export type DashboardLeaderboardItem = {
  id: string;
  label: string;
  revenue: number;
  sold_coupons?: number;
};

// Bloque de rendimiento comercial consolidado.
export type DashboardPerformance = {
  top_company_name: string;
  top_company_revenue: number;
  top_category_name: string;
  top_category_revenue: number;
  top_offer_title: string;
  top_offer_sold: number;
  trend_last_30_days: DashboardTrendPoint[];
  sold_last_30_days: number;
  sold_previous_30_days: number;
  revenue_last_30_days: number;
  revenue_previous_30_days: number;
  sold_variation_pct: number | null;
  revenue_variation_pct: number | null;
  avg_ticket_per_coupon: number;
  avg_revenue_per_approved_offer: number;
  top_companies_by_revenue: DashboardLeaderboardItem[];
  top_categories_by_revenue: DashboardLeaderboardItem[];
  top_offers_by_revenue: DashboardLeaderboardItem[];
};

// Respuesta agregada que consume la vista /dashboard.
export type AdminPlatformDashboardData = {
  kpis: DashboardKpis;
  performance: DashboardPerformance;
  error?: string;
};
