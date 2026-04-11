import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";

export default async function PlatformAdminLayout({children,}: {
  children: ReactNode;
}) {
  await requireRole(["ADMIN_PLATFORM"]);

  return <>{children}</>;
}