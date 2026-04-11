export type OfferStatus = "PENDING" | "APPROVED" | "REJECTED" | "DISCARDED";
export type OfferStateFilter =
  | "ALL"
  | "PENDING"
  | "APPROVED_FUTURE"
  | "ACTIVE"
  | "PAST"
  | "REJECTED"
  | "DISCARDED";
export type OfferSortBy =
  | "offer_title"
  | "company_name"
  | "offer_price"
  | "offer_start_date"
  | "offer_end_date"
  | "created_at";
export type SortDirection = "asc" | "desc";

export type OfferQueryParams = {
  search: string;
  companyId: string;
  state: OfferStateFilter;
  sortBy: OfferSortBy;
  sortDir: SortDirection;
  page: number;
  pageSize: number;
};

export type OfferCompanyOption = {
  company_id: string;
  company_name: string;
};

export type OfferListItem = {
  offer_id: string;
  offer_title: string;
  offer_description: string;
  offer_regular_price: number;
  offer_price: number;
  offer_start_date: string;
  offer_end_date: string;
  coupon_usage_deadline: string;
  coupon_quantity_limit: number | null;
  offer_status: OfferStatus;
  offer_rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  company_id: string | null;
  company_name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type OffersListResponse = {
  data: OfferListItem[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
};

export type OfferActionResult<T = null> = {
  ok: boolean;
  message: string;
  data?: T;
};
