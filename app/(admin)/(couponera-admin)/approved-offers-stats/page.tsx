import { ApprovedOffersStatsDashboard } from "@/components/approved-offers-stats/approved-offers-stats-dashboard";
import {
  listApprovedOfferStats,
  listApprovedOfferStatsFilters,
} from "./actions";

// Render inicial server-side para evitar estados de carga vacios en la tabla.
export default async function ApprovedOffersStatsPage() {
  const [initialList, filters] = await Promise.all([
    // Carga de dataset inicial con parametros por defecto del modulo.
    listApprovedOfferStats({
      search: "",
      companyId: "",
      categoryId: "",
      sortBy: "offer_title",
      sortDir: "asc",
      page: 1,
      pageSize: 10,
    }),
    // Carga de opciones de filtro (empresas y categorias).
    listApprovedOfferStatsFilters(),
  ]);

  return (
    <ApprovedOffersStatsDashboard initialList={initialList} filters={filters} />
  );
}
