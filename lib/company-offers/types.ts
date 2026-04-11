export type OfferStatus =
  | "PENDING"
  | "APPROVED"
  | "OUT_OF_STOCK"
  | "REJECTED"
  | "DISCARDED";

export type OfferCategory =
  | "pending"
  | "to_correct"
  | "approved"
  | "approved_active"
  | "all";

export type OfferSortBy =
  | "offer_title"
  | "offer_status"
  | "offer_start_date"
  | "offer_end_date"
  | "offer_price";

export type SortDirection = "asc" | "desc";

export type OfferQueryParams = {
  search: string;
  category: OfferCategory;
  sortBy: OfferSortBy;
  sortDir: SortDirection;
  page: number;
  pageSize: number;
};

export type OfferDetailFormInput = {
  item_title: string;
  item_description: string;
  item_sort_order: string;
};

export type OfferImagePayload = {
  name: string;
  type: string;
  dataUrl: string;
};

export type OfferImageFormInput = {
  image_url: string;
  image_alt_text: string;
  image_sort_order: string;
  main_image: boolean;
  upload?: OfferImagePayload | null;
};

export type OfferFormInput = {
  offer_title: string;
  offer_description: string;
  offer_regular_price: string;
  offer_price: string;
  offer_start_date: string;
  offer_end_date: string;
  coupon_usage_deadline: string;
  coupon_quantity_limit: string;
  details: OfferDetailFormInput[];
  images: OfferImageFormInput[];
};

export type OfferListDetail = {
  offer_list_detail_id: string;
  item_title: string;
  item_description: string;
  item_sort_order: number;
};

export type OfferCarouselImage = {
  offer_carousel_image_id: string;
  image_url: string;
  image_alt_text: string | null;
  image_sort_order: number;
  main_image: boolean;
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
  created_at: string;
  updated_at: string;
  main_image_url: string | null;
  list_category: OfferCategory;
};

export type OfferDetail = OfferListItem & {
  details: OfferListDetail[];
  images: OfferCarouselImage[];
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
