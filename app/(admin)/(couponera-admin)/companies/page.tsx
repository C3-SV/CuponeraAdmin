import { CompaniesCrud } from "@/components/companies/companies-crud";
import { listCategoriesForFilter, listCompanies } from "./actions";

export default async function CompaniesPage() {
  const [initialList, initialCategories] = await Promise.all([
    listCompanies({
      search: "",
      categoryId: "",
      sortBy: "company_name",
      sortDir: "asc",
      page: 1,
      pageSize: 10,
    }),
    listCategoriesForFilter(),
  ]);

  return (
    <CompaniesCrud
      initialList={initialList}
      initialCategories={initialCategories}
    />
  );
}
