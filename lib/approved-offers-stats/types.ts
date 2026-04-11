export type ApprovedOfferStatsSortBy =
  | "offer_title"
  | "company_name"
  | "offer_price"
  | "sold_coupons"
  | "available_coupons"
  | "total_revenue"
  | "service_fee"
  | "offer_start_date"
  | "offer_end_date"
  | "coupon_usage_deadline";

export type SortDirection = "asc" | "desc";

export type ApprovedOfferStatsQueryParams = {
  search: string;
  companyId: string;
  categoryId: string;
  sortBy: ApprovedOfferStatsSortBy;
  sortDir: SortDirection;
  page: number;
  pageSize: number;
};

export type ApprovedOfferStatsFilterOption = {
  id: string;
  name: string;
};

export type ApprovedOfferStatsFilters = {
  companies: ApprovedOfferStatsFilterOption[];
  categories: ApprovedOfferStatsFilterOption[];
};

export type ApprovedOfferStatsItem = {
  offer_id: string;
  offer_title: string;
  offer_code: string;
  company_id: string;
  company_name: string;
  category_id: string | null;
  category_name: string | null;
  offer_price: number;
  offer_start_date: string;
  offer_end_date: string;
  coupon_usage_deadline: string;
  coupon_quantity_limit: number | null;
  sold_coupons: number;
  available_coupons: number | null;
  total_revenue: number;
  service_fee: number;
};

export type ApprovedOfferStatsKpis = {
  total_approved_offers: number;
  total_sold_coupons: number;
  total_revenue: number;
  total_service_fee: number;
  total_available_coupons_finite: number;
  unlimited_offers_count: number;
};

export type ApprovedOfferRevenueBar = {
  offer_id: string;
  offer_title: string;
  total_revenue: number;
};

export type ApprovedOfferStatsCharts = {
  top_revenue_offers: ApprovedOfferRevenueBar[];
  sold_vs_available: {
    sold: number;
    available_finite: number;
    unlimited_offers_count: number;
  };
};

export type ApprovedOfferStatsResponse = {
  data: ApprovedOfferStatsItem[];
  total: number;
  page: number;
  pageSize: number;
  kpis: ApprovedOfferStatsKpis;
  charts: ApprovedOfferStatsCharts;
  error?: string;
};
