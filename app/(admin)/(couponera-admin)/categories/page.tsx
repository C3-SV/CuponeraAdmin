import { listCategories } from "@/app/(admin)/(couponera-admin)/categories/actions";
import { CategoriesCrud } from "@/components/categories/categories-crud";

export default async function CategoriesPage() {
  const initialList = await listCategories();

  return <CategoriesCrud initialList={initialList} />;
}
