import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";

export default async function EmployeeLayout({children,}: {
  children: ReactNode;
}) {
  await requireRole(["EMPLOYEE"]);

  return <>{children}</>;
}