import { CompanyAdminAssignmentCrud } from "@/components/company-admin-assignment/company-admin-assignment-crud";
import { listCompanyAdminAssignments } from "./actions";

// Carga inicial server-side para hidratar la tabla con estado consistente.
export default async function CompanyAdminAssignmentPage() {
  const initialList = await listCompanyAdminAssignments({
    search: "",
    sortBy: "company_name",
    sortDir: "asc",
    page: 1,
    pageSize: 10,
  });

  return (
    <CompanyAdminAssignmentCrud initialList={initialList} />
  );
}
