import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";

export default async function CompanyAdminLayout({children,}: {
  children: ReactNode;
}) {
  await requireRole(["ADMIN_COMPANY"]);

  return <>{children}</>;
}