export type CustomerSortBy = "first_names" | "last_names" | "created_at";
export type SortDirection = "asc" | "desc";

export type CustomerQueryParams = {
  search: string;
  sortBy: CustomerSortBy;
  sortDir: SortDirection;
  page: number;
  pageSize: number;
};

// Fila de cliente renderizada en la tabla principal.
export type CustomerListItem = {
  user_id: string;
  email: string;
  first_names: string;
  last_names: string;
  full_name: string;
  dui: string | null;
  phone: string | null;
  address: string | null;
  user_is_active: boolean;
  created_at: string;
};

// Estado del cupón tal como llega de la BD.
export type CouponStatus = "AVAILABLE" | "REDEEMED" | "EXPIRED";

// Cupón con datos de la oferta anidada.
export type CustomerCoupon = {
  coupon_id: string;
  coupon_code: string;
  coupon_status: CouponStatus;
  coupon_expires_at: string | null;
  coupon_redeemed_at: string | null;
  offer_title: string;
  offer_price: number;
  company_name: string;
};

// Respuesta paginada del listado de clientes.
export type CustomersListResponse = {
  data: CustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
};

// Resultado al cargar cupones de un cliente.
export type CustomerCouponsResult = {
  ok: boolean;
  data: CustomerCoupon[];
  message?: string;
};
