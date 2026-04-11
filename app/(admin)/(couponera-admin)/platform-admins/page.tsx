import { listPlatformAdmins } from "@/app/(admin)/(couponera-admin)/platform-admins/actions";
import { PlatformAdminsCrud } from "@/components/platform-admins/platform-admins-crud";

export default async function PlatformAdminsPage() {
  const initialList = await listPlatformAdmins();

  return <PlatformAdminsCrud initialList={initialList} />;
}
