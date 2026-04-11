import { CompanyEmployeesCrud } from "@/components/company-employees/company-employees-crud";
import { listCompanyEmployees } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CompanyEmployeesPage() {
  const initialList = await listCompanyEmployees({
    search: "",
    status: "all",
    sortBy: "first_names",
    sortDir: "asc",
    page: 1,
    pageSize: 10,
  });

  return <CompanyEmployeesCrud initialList={initialList} />;
}
