import { CompaniesCrud } from "@/components/companies/companies-crud";
import { listCategoriesForFilter, listCompanies } from "./actions";

// Entrada server-side del CRUD de empresas con estado inicial listo para hidratar.
export default async function CompaniesPage() {
  const [initialList, initialCategories] = await Promise.all([
    // Primer fetch con parametros por defecto de listado.
    listCompanies({
      search: "",
      categoryId: "",
      sortBy: "company_name",
      sortDir: "asc",
      page: 1,
      pageSize: 10,
    }),
    // Carga de categorias para filtros y formularios.
    listCategoriesForFilter(),
  ]);

  return (
    <CompaniesCrud
      initialList={initialList}
      initialCategories={initialCategories}
    />
  );
}
