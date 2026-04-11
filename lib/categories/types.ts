export type CategorySortBy = "category_name" | "created_at";
export type SortDirection = "asc" | "desc";

export type CategoryQueryParams = {
  search: string;
  sortBy: CategorySortBy;
  sortDir: SortDirection;
  page: number;
  pageSize: number;
};

// Fila de rubro renderizada en la tabla principal.
export type CategoryListItem = {
  category_id: string;
  category_name: string;
  category_img: string | null;
  category_img_url: string | null;
  category_img_hover: string | null;
  alt_text: string | null;
  created_at: string;
  updated_at: string;
};

// Datos editables desde el modal de crear/editar.
export type CategoryFormInput = {
  category_name: string;
  alt_text: string;
};

// Payload serializado de imagen cargada desde el frontend.
export type CategoryImagePayload = {
  name: string;
  type: string;
  dataUrl: string;
};

// Respuesta paginada del listado de rubros.
export type CategoriesListResponse = {
  data: CategoryListItem[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
};

// Contrato estándar para acciones mutables.
export type CategoryActionResult<T = null> = {
  ok: boolean;
  message: string;
  data?: T;
};
