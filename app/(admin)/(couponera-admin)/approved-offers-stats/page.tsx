import { ApprovedOffersStatsDashboard } from "@/components/approved-offers-stats/approved-offers-stats-dashboard";
import {
  listApprovedOfferStats,
  listApprovedOfferStatsFilters,
} from "./actions";

export default async function ApprovedOffersStatsPage() {
  const [initialList, filters] = await Promise.all([
    listApprovedOfferStats({
      search: "",
      companyId: "",
      categoryId: "",
      sortBy: "offer_title",
      sortDir: "asc",
      page: 1,
      pageSize: 10,
    }),
    listApprovedOfferStatsFilters(),
  ]);

  return (
    <ApprovedOffersStatsDashboard initialList={initialList} filters={filters} />
  );
}
