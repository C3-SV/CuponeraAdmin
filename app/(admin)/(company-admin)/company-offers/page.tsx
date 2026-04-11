import { CompanyOffersCrud } from "@/components/company-offers/company-offers-crud";
import { getCurrentCompanyOfferTitle, listCompanyOffers } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CompanyOffersPage() {
  const [initialList, companyName] = await Promise.all([
    listCompanyOffers({
      search: "",
      category: "all",
      sortBy: "offer_start_date",
      sortDir: "desc",
      page: 1,
      pageSize: 10,
    }),
    getCurrentCompanyOfferTitle(),
  ]);

  return <CompanyOffersCrud initialList={initialList} companyName={companyName} />;
}
