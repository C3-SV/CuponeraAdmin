// Campos permitidos para orden en la tabla de companies.
export type CompanySortBy =
  | "company_code"
  | "company_name"
  | "company_commission_rate"
  | "category_name";
export type SortDirection = "asc" | "desc";

// Query params compartidos entre server action y UI cliente.
export type CompanyQueryParams = {
  search: string;
  categoryId: string;
  sortBy: CompanySortBy;
  sortDir: SortDirection;
  page: number;
  pageSize: number;
};

// Opcion de categoria usada en filtro y select del formulario.
export type CompanyCategoryOption = {
  category_id: string;
  category_name: string;
  category_img: string | null;
  category_icon_url: string | null;
};

// Fila de company renderizada en la grilla principal.
export type CompanyListItem = {
  company_id: string;
  company_code: string;
  company_name: string;
  company_photo: string | null;
  company_address: string | null;
  company_commission_rate: number;
  category_id: string;
  category_name: string;
  category_img: string | null;
  category_icon_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyDetail = CompanyListItem;

// Datos editables desde modal de crear/editar.
export type CompanyFormInput = {
  company_code: string;
  company_name: string;
  company_address: string;
  company_commission_rate: string;
  category_id: string;
};

// Payload serializado de imagen cargada desde el frontend.
export type CompanyImagePayload = {
  name: string;
  type: string;
  dataUrl: string;
};

// Respuesta paginada del listado de empresas.
export type CompaniesListResponse = {
  data: CompanyListItem[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
};

// Contrato estandar para respuestas de acciones mutables.
export type CompanyActionResult<T = null> = {
  ok: boolean;
  message: string;
  data?: T;
};
