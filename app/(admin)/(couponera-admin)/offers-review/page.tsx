import { OffersReview } from "@/components/offers/offers-review";
import { listOfferCompanies, listOffers } from "./actions";

export default async function OffersReviewPage() {
  const [initialList, companies] = await Promise.all([
    listOffers({
      search: "",
      companyId: "",
      state: "PENDING",
      sortBy: "created_at",
      sortDir: "desc",
      page: 1,
      pageSize: 10,
    }),
    listOfferCompanies(),
  ]);

  return <OffersReview initialList={initialList} companies={companies} />;
}