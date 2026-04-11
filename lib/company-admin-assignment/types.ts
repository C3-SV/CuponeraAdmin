// Campos permitidos para ordenamiento en la grilla principal.
export type CompanyAdminAssignmentSortBy =
  | "company_code"
  | "company_name"
  | "assigned_admin";

// Direccion de orden reutilizable en consultas de tabla.
export type SortDirection = "asc" | "desc";

// Parametros de lectura para busqueda, orden y paginacion.
export type CompanyAdminAssignmentQueryParams = {
  search: string;
  sortBy: CompanyAdminAssignmentSortBy;
  sortDir: SortDirection;
  page: number;
  pageSize: number;
};

// Resumen del admin que se muestra en tabla y detalle.
export type AssignedAdminSummary = {
  user_id: string;
  first_names: string;
  last_names: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  user_is_active: boolean;
  created_at: string;
  updated_at: string;
};

// Fila de la tabla company-admin-assignment.
export type CompanyAdminAssignmentListItem = {
  company_id: string;
  company_code: string;
  company_name: string;
  assigned_admin: AssignedAdminSummary | null;
};

// Respuesta normalizada para consumo del frontend.
export type CompanyAdminAssignmentListResponse = {
  data: CompanyAdminAssignmentListItem[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
};

// Payload para crear un ADMIN_COMPANY.
export type CompanyAdminCreateInput = {
  first_names: string;
  last_names: string;
  email: string;
  phone: string;
  password: string;
  user_is_active: boolean;
};

// Payload editable de un ADMIN_COMPANY existente.
export type CompanyAdminUpdateInput = {
  first_names: string;
  last_names: string;
  email: string;
  phone: string;
  user_is_active: boolean;
};

// El detalle comparte estructura de fila, con admin opcional.
export type CompanyAdminDetail = CompanyAdminAssignmentListItem;

// Contrato comun para acciones de server.
export type CompanyAdminActionResult<T = null> = {
  ok: boolean;
  message: string;
  data?: T;
};
